import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  getAllowedSkills,
  getAllowedTools,
  type AuthRole,
} from "./access.ts";
import { definition as findPatientsDef } from "./tools/find_patients/definitions.ts";
import { handleFindPatients } from "./tools/find_patients/handlers.ts";
import { definition as listPatientsDef } from "./tools/list_patients/definitions.ts";
import { handleListPatients } from "./tools/list_patients/handlers.ts";
import { definition as listDoctorsDef } from "./tools/list_doctors/definitions.ts";
import { handleListDoctors } from "./tools/list_doctors/handlers.ts";
import { definition as listExpertsDef } from "./tools/list_experts/definitions.ts";
import { handleListExperts } from "./tools/list_experts/handlers.ts";
import { definition as getDoctorDef } from "./tools/get_doctor/definitions.ts";
import { handleGetDoctor } from "./tools/get_doctor/handlers.ts";
import { definition as getExpertDef } from "./tools/get_expert/definitions.ts";
import { handleGetExpert } from "./tools/get_expert/handlers.ts";
import { definition as getPatientRecordDef } from "./tools/get_patient_record/definitions.ts";
import { handleGetPatientRecord } from "./tools/get_patient_record/handlers.ts";
import { definition as getLabResultsDef } from "./tools/get_lab_results/definitions.ts";
import { handleGetLabResults } from "./tools/get_lab_results/handlers.ts";
import { definition as getAppointmentsDef } from "./tools/get_appointments/definitions.ts";
import { handleGetAppointments } from "./tools/get_appointments/handlers.ts";
import { definition as getCustomerStatsDef } from "./tools/get_customer_stats/definitions.ts";
import { handleGetCustomerStats } from "./tools/get_customer_stats/handlers.ts";
import { definition as checkDrugInteractionDef } from "./tools/check_drug_interaction/definitions.ts";
import { handleCheckDrugInteraction } from "./tools/check_drug_interaction/handlers.ts";
import { definition as createPatientDef } from "./tools/create_patient/definitions.ts";
import { handleCreatePatient } from "./tools/create_patient/handlers.ts";
import { definition as updatePatientDef } from "./tools/update_patient/definitions.ts";
import { handleUpdatePatient } from "./tools/update_patient/handlers.ts";
import { definition as deletePatientDef } from "./tools/delete_patient/definitions.ts";
import { handleDeletePatient } from "./tools/delete_patient/handlers.ts";
import { definition as readSkillDef } from "./tools/read_skill/definitions.ts";
import { handleReadSkill } from "./tools/read_skill/handlers.ts";
import { definition as readMemoryDef } from "./tools/read_memory/definitions.ts";
import { handleReadMemory } from "./tools/read_memory/handlers.ts";
import { definition as updateUserProfileDef } from "./tools/update_user_profile/definitions.ts";
import { handleUpdateUserProfile } from "./tools/update_user_profile/handlers.ts";
import { definition as updateWorkingStyleDef } from "./tools/update_working_style/definitions.ts";
import { handleUpdateWorkingStyle } from "./tools/update_working_style/handlers.ts";
import { definition as updateMemoryDef } from "./tools/update_memory/definitions.ts";
import { handleUpdateMemory } from "./tools/update_memory/handlers.ts";
import { definition as listSkillsDef } from "./tools/list_skills/definitions.ts";
import { handleListSkills } from "./tools/list_skills/handlers.ts";
import { definition as writeSkillDef } from "./tools/write_skill/definitions.ts";
import { handleWriteSkill } from "./tools/write_skill/handlers.ts";
import { definition as deleteSkillDef } from "./tools/delete_skill/definitions.ts";
import { handleDeleteSkill } from "./tools/delete_skill/handlers.ts";

const tools: Anthropic.Tool[] = [
  findPatientsDef,
  listPatientsDef,
  listDoctorsDef,
  listExpertsDef,
  getDoctorDef,
  getExpertDef,
  getPatientRecordDef,
  getLabResultsDef,
  getAppointmentsDef,
  getCustomerStatsDef,
  checkDrugInteractionDef,
  createPatientDef,
  updatePatientDef,
  deletePatientDef,
  readSkillDef,
  readMemoryDef,
  updateUserProfileDef,
  updateWorkingStyleDef,
  updateMemoryDef,
  listSkillsDef,
  writeSkillDef,
  deleteSkillDef,
];

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
    case "list_patients":
      return handleListPatients();
    case "list_doctors":
      return handleListDoctors();
    case "list_experts":
      return handleListExperts();
    case "get_doctor":
      return handleGetDoctor(String(input.doctor_id ?? ""));
    case "get_expert":
      return handleGetExpert(String(input.expert_id ?? ""));
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
    case "delete_patient":
      return handleDeletePatient(input);
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
    case "delete_skill":
      return handleDeleteSkill(String(input.name ?? ""));
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
