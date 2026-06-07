import type { Message, MessagePart, ToolCall } from "@pr_hospitalagent/types";
import {
  conversationRepo,
  type StoredBlock,
  type StoredMessage,
} from "../repositories/conversation.repo.ts";
import { patientRepo } from "../repositories/patient.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { NotFoundError } from "../lib/errors.ts";

const AUDIT_RE = /^(BS|BN)\d+$/i;

type OwnerRole = "doctor" | "patient" | "unknown";
const ownerRoleOf = (id?: string): OwnerRole =>
  !id ? "unknown" : /^BS/i.test(id) ? "doctor" : /^BN/i.test(id) ? "patient" : "unknown";

function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => {
      if (typeof b === "string") return b;
      if (b && typeof b === "object" && "type" in b && (b as any).type === "text") {
        return (b as { text?: string }).text ?? "";
      }
      return "";
    })
    .join("");
}

function collectToolResults(stored: StoredMessage[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const msg of stored) {
    if (msg.role !== "user" || typeof msg.content === "string") continue;
    for (const block of msg.content) {
      if (block.type === "tool_result") {
        out.set(
          (block as any).tool_use_id,
          toolResultText((block as any).content)
        );
      }
    }
  }
  return out;
}

// Chuyển stored (Anthropic MessageParam) → Message[] để FE render.
// Bê nguyên từ agent service cũ (routes/conversations.ts).
export function convertMessages(
  stored: StoredMessage[],
  fallbackDate: Date
): Message[] {
  const results = collectToolResults(stored);
  const out: Message[] = [];
  let counter = 0;
  const nextId = () => `msg_${counter++}`;

  for (const msg of stored) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        out.push({
          id: nextId(),
          role: "user",
          content: msg.content,
          createdAt: fallbackDate,
        });
        continue;
      }
      const text = (msg.content as StoredBlock[])
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("");
      if (text) {
        out.push({
          id: nextId(),
          role: "user",
          content: text,
          createdAt: fallbackDate,
        });
      }
      // user-message thuần tool_result được gộp vào assistant phía trước.
      continue;
    }

    let text = "";
    const toolCalls: ToolCall[] = [];
    const parts: MessagePart[] = [];
    const pushText = (t: string) => {
      if (!t) return;
      const last = parts[parts.length - 1];
      if (last && last.type === "text") last.text += t;
      else parts.push({ type: "text", text: t });
    };
    if (typeof msg.content === "string") {
      text = msg.content;
      pushText(msg.content);
    } else {
      for (const block of msg.content) {
        if (block.type === "text") {
          text += (block as any).text;
          pushText((block as any).text);
        } else if (block.type === "tool_use") {
          const tu = block as { id: string; name: string; input: unknown };
          const result = results.get(tu.id);
          const tc: ToolCall = {
            id: tu.id,
            name: tu.name,
            input: tu.input as Record<string, unknown>,
            result,
            status: "done",
          };
          toolCalls.push(tc);
          parts.push({ type: "tool", toolCall: tc });
        }
      }
    }
    // Một lượt chat của agent được lưu thành NHIỀU assistant MessageParam (mỗi vòng
    // tool-use một bản ghi, xen kẽ user/tool_result đã bị bỏ qua ở trên). Gộp các
    // assistant liên tiếp lại thành MỘT Message để FE thu gọn cả "quá trình" vào một
    // dòng (giống lúc stream). Tin user thật (có text) cắt chuỗi gộp này.
    const prev = out[out.length - 1];
    if (prev && prev.role === "assistant") {
      prev.content = (prev.content ?? "") + text;
      if (toolCalls.length > 0) {
        prev.toolCalls = [...(prev.toolCalls ?? []), ...toolCalls];
      }
      if (parts.length > 0) {
        const merged = prev.parts ?? [];
        for (const p of parts) {
          const last = merged[merged.length - 1];
          if (p.type === "text" && last && last.type === "text") last.text += p.text;
          else merged.push(p);
        }
        prev.parts = merged;
      }
      continue;
    }
    out.push({
      id: nextId(),
      role: "assistant",
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      parts: parts.length > 0 ? parts : undefined,
      createdAt: fallbackDate,
    });
  }

  return out;
}

export const conversationService = {
  // === Owner (doctor + patient) ===
  async list(ownerId: string) {
    const docs = await conversationRepo.listByOwner(ownerId);
    return {
      conversations: docs.map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
        patientId: d.patientId,
      })),
    };
  },

  async get(id: string, ownerId: string) {
    const doc = await conversationRepo.findByOwner(id, ownerId);
    if (!doc) throw new NotFoundError("Conversation not found");
    return {
      id: doc.id,
      title: doc.title,
      patientId: doc.patientId,
      messages: convertMessages(doc.messages ?? [], doc.createdAt),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  // Trả messages thô — cho agent loop resume.
  async getRaw(id: string, ownerId: string) {
    const doc = await conversationRepo.findByOwner(id, ownerId);
    if (!doc) throw new NotFoundError("Conversation not found");
    return {
      id: doc.id,
      title: doc.title,
      messages: doc.messages ?? [],
    };
  },

  async save(
    id: string,
    ownerId: string,
    data: { title?: string; messages: StoredMessage[] }
  ) {
    const doc = await conversationRepo.upsert(id, ownerId, data);
    return { id: doc?.id ?? id };
  },

  async delete(id: string, ownerId: string) {
    const ok = await conversationRepo.delete(id, ownerId);
    if (!ok) throw new NotFoundError("Conversation not found");
    return { ok: true };
  },

  // === Audit (expert, chỉ đọc) ===
  async listAudit() {
    const docs = await conversationRepo.listByPattern(AUDIT_RE);
    const ids = Array.from(
      new Set(docs.map((d) => d.doctorId).filter((x): x is string => !!x))
    );
    const doctorIds = ids.filter((id) => /^BS/i.test(id));
    const patientIds = ids.filter((id) => /^BN/i.test(id));
    const [doctors, patients] = await Promise.all([
      doctorRepo.listByIds(doctorIds),
      patientRepo.listByIds(patientIds),
    ]);
    const nameById = new Map<string, string>();
    for (const d of doctors) nameById.set(d.id, d.fullName);
    for (const p of patients) nameById.set(p.id, p.name);
    return {
      conversations: docs.map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
        ownerId: d.doctorId ?? null,
        ownerName: d.doctorId ? nameById.get(d.doctorId) ?? null : null,
        ownerRole: ownerRoleOf(d.doctorId),
      })),
    };
  },

  async getAudit(id: string) {
    const doc = await conversationRepo.findById(id);
    if (!doc) throw new NotFoundError("Conversation not found");
    const ownerRole = ownerRoleOf(doc.doctorId);
    let ownerName: string | null = null;
    if (doc.doctorId && ownerRole !== "unknown") {
      if (ownerRole === "doctor") {
        const docs = await doctorRepo.listByIds([doc.doctorId]);
        ownerName = docs[0]?.fullName ?? null;
      } else {
        const pts = await patientRepo.listByIds([doc.doctorId]);
        ownerName = pts[0]?.name ?? null;
      }
    }
    return {
      id: doc.id,
      title: doc.title,
      ownerId: doc.doctorId ?? null,
      ownerName,
      ownerRole,
      messages: convertMessages(doc.messages ?? [], doc.createdAt),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
};
