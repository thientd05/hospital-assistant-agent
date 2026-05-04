import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { tools } from "./tools/definitions.ts";
import {
  getAllowedSkills,
  getAllowedTools,
  type AuthRole,
} from "./access.ts";
import {
  handleFindPatients,
  handleGetPatientRecord,
  handleGetLabResults,
  handleCheckDrugInteraction,
  handleGetAppointments,
  handleGetCustomerStats,
  handleCreatePatient,
  handleUpdatePatient,
  handleListSkills,
  handleReadSkill,
  handleWriteSkill,
  handleReadMemory,
  handleUpdateUserProfile,
  handleUpdateWorkingStyle,
  handleUpdateMemory,
} from "./tools/handlers.ts";

const AGENT_DIR = import.meta.dirname;
const BOOTS_DIR = join(AGENT_DIR, "boots");
const SKILLS_DIR = join(AGENT_DIR, "skills");

function loadAgentPrompt(role: AuthRole): string {
  return readFileSync(join(BOOTS_DIR, role, "AGENT.md"), "utf8");
}

function readWorkspaceFile(doctorId: string, name: string): string | null {
  const path = join(AGENT_DIR, "workspaces", doctorId, name);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf8").trim();
  return content || null;
}

type SkillEntry = { name: string; description: string };

function parseFrontmatter(content: string): Record<string, string> {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

function loadSkillIndex(role: AuthRole): SkillEntry[] {
  if (!existsSync(SKILLS_DIR)) return [];
  const allowed = getAllowedSkills(role);
  const out: SkillEntry[] = [];
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!allowed.has(entry.name)) continue;
    const skillPath = join(SKILLS_DIR, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const content = readFileSync(skillPath, "utf8");
    const fm = parseFrontmatter(content);
    out.push({
      name: entry.name,
      description: fm.description ?? "(không có mô tả)",
    });
  }
  return out;
}

function formatSkillIndex(skills: SkillEntry[]): string {
  if (skills.length === 0) return "";
  const items = skills
    .map((s) => `- \`${s.name}\` — ${s.description}`)
    .join("\n");
  return [
    "# Kỹ năng có sẵn",
    "",
    "Bạn có một thư viện kỹ năng. Mỗi kỹ năng là một quy trình chi tiết được lưu thành file markdown riêng — KHÔNG nạp sẵn vào ngữ cảnh để tiết kiệm token. Khi nhận thấy yêu cầu của bác sĩ phù hợp với mô tả ngắn của một kỹ năng, hãy gọi tool `read_skill` với TÊN kỹ năng (ví dụ `{ name: \"patient-intake\" }`) để đọc hướng dẫn đầy đủ TRƯỚC khi thực hiện. Sau khi đọc, làm theo từng bước trong file.",
    "",
    items,
  ].join("\n");
}

function buildSystemPrompt(doctorId: string, role: AuthRole): string {
  const parts = [loadAgentPrompt(role).trim()];
  const user = readWorkspaceFile(doctorId, "USER.md");
  const soul = readWorkspaceFile(doctorId, "SOUL.md");
  if (user) parts.push(user);
  if (soul) parts.push(soul);
  const index = formatSkillIndex(loadSkillIndex(role));
  if (index) parts.push(index);
  return parts.join("\n\n---\n\n");
}

const anthropic = new Anthropic();

export const MODEL_IDS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
} as const;

export type ModelKey = keyof typeof MODEL_IDS;

export type OnChunk = (text: string) => void;
export type OnToolCall = (toolCall: {
  id: string;
  name: string;
  input: unknown;
  result?: string;
  status: "running" | "done";
}) => void;

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  doctorId: string,
  role: AuthRole
): Promise<string> {
  if (!getAllowedTools(role).has(name)) {
    return JSON.stringify({
      error: `Tool "${name}" không khả dụng cho vai trò "${role}". Yêu cầu bị từ chối ở tầng dispatch.`,
    });
  }
  switch (name) {
    case "find_patients":
      return handleFindPatients(input);
    case "get_patient_record":
      return handleGetPatientRecord(String(input.patient_id));
    case "get_lab_results":
      return handleGetLabResults(
        String(input.patient_id),
        typeof input.limit === "number" ? input.limit : 10
      );
    case "check_drug_interaction":
      return handleCheckDrugInteraction(
        Array.isArray(input.drugs) ? (input.drugs as string[]) : []
      );
    case "get_appointments":
      return handleGetAppointments(doctorId);
    case "get_customer_stats":
      return handleGetCustomerStats(input);
    case "create_patient":
      return handleCreatePatient(input);
    case "update_patient":
      return handleUpdatePatient(input);
    case "read_skill": {
      const skillName = String(input.name ?? "");
      if (!getAllowedSkills(role).has(skillName)) {
        return JSON.stringify({
          error: `Kỹ năng "${skillName}" không khả dụng cho vai trò "${role}". Yêu cầu bị từ chối ở tầng dispatch.`,
        });
      }
      return handleReadSkill(skillName);
    }
    case "list_skills":
      return handleListSkills();
    case "write_skill":
      return handleWriteSkill(String(input.name ?? ""), String(input.content ?? ""));
    case "read_memory":
      return handleReadMemory(doctorId, String(input.file ?? ""));
    case "update_user_profile":
      return handleUpdateUserProfile(doctorId, String(input.content ?? ""));
    case "update_working_style":
      return handleUpdateWorkingStyle(doctorId, String(input.content ?? ""));
    case "update_memory":
      return handleUpdateMemory(doctorId, String(input.entry ?? ""));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

const EPHEMERAL: Anthropic.CacheControlEphemeral = { type: "ephemeral" };

function withToolsCache(toolList: Anthropic.Tool[]): Anthropic.Tool[] {
  if (toolList.length === 0) return toolList;
  const lastIdx = toolList.length - 1;
  return toolList.map((t, i) =>
    i === lastIdx ? { ...t, cache_control: EPHEMERAL } : t
  );
}

function withMessagesCache(
  msgs: Anthropic.MessageParam[]
): Anthropic.MessageParam[] {
  if (msgs.length === 0) return msgs;
  const lastIdx = msgs.length - 1;
  const last = msgs[lastIdx]!;
  let content: Anthropic.MessageParam["content"];
  if (typeof last.content === "string") {
    content = [
      { type: "text", text: last.content, cache_control: EPHEMERAL },
    ];
  } else {
    if (last.content.length === 0) return msgs;
    const blocks = last.content.map((b, i) =>
      i === last.content.length - 1 ? { ...b, cache_control: EPHEMERAL } : b
    );
    content = blocks as typeof last.content;
  }
  return [...msgs.slice(0, lastIdx), { ...last, content }];
}

export async function runAgentLoop(
  messages: Anthropic.MessageParam[],
  modelKey: ModelKey,
  onChunk: OnChunk,
  onToolCall: OnToolCall,
  doctorId: string,
  role: AuthRole
): Promise<Anthropic.MessageParam[]> {
  let working = [...messages];
  const modelId = MODEL_IDS[modelKey];
  const systemPrompt = buildSystemPrompt(doctorId, role);
  const allowedToolNames = getAllowedTools(role);
  const allowedTools = tools.filter((t) => allowedToolNames.has(t.name));

  while (true) {
    const stream = anthropic.messages.stream({
      model: modelId,
      max_tokens: 8192,
      system: [{ type: "text", text: systemPrompt, cache_control: EPHEMERAL }],
      tools: withToolsCache(allowedTools),
      messages: withMessagesCache(working),
    });

    stream.on("text", (delta) => onChunk(delta));

    const finalMessage = await stream.finalMessage();

    working.push({ role: "assistant", content: finalMessage.content });

    if (finalMessage.stop_reason !== "tool_use") {
      return working;
    }

    const toolUses = finalMessage.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      onToolCall({
        id: tu.id,
        name: tu.name,
        input: tu.input,
        status: "running",
      });
      const result = await dispatchTool(
        tu.name,
        tu.input as Record<string, unknown>,
        doctorId,
        role
      );
      onToolCall({
        id: tu.id,
        name: tu.name,
        input: tu.input,
        result,
        status: "done",
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: result,
      });
    }

    working.push({ role: "user", content: toolResults });
  }
}
