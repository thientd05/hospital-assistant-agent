import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  getAllowedSkills,
  getAllowedTools,
  type AuthRole,
} from "./access.ts";
import type { PanelClient } from "./panel-bridge.ts";
import { definition as toolExampleDef } from "./tools/tool_example/definitions.ts";
import { handleToolExample } from "./tools/tool_example/handlers.ts";
import { definition as openPatientFormDef } from "./tools/open_patient_form/definitions.ts";
import { handleOpenPatientForm } from "./tools/open_patient_form/handlers.ts";
import { definition as submitPatientFormDef } from "./tools/submit_patient_form/definitions.ts";
import { handleSubmitPatientForm } from "./tools/submit_patient_form/handlers.ts";
import { definition as readSkillDef } from "./tools/read_skill/definitions.ts";
import { handleReadSkill } from "./tools/read_skill/handlers.ts";

const tools: Anthropic.Tool[] = [
  toolExampleDef,
  openPatientFormDef,
  submitPatientFormDef,
  readSkillDef,
];

const AGENT_DIR = import.meta.dirname;
const BOOTS_DIR = join(AGENT_DIR, "boots");
const SKILLS_DIR = join(AGENT_DIR, "skills");

function loadAgentPrompt(role: AuthRole): string {
  return readFileSync(join(BOOTS_DIR, role, "AGENT.md"), "utf8");
}

function loadSkillFrontmatter(
  skillName: string
): { name: string; description: string } | null {
  const path = join(SKILLS_DIR, skillName, "SKILL.md");
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf8");
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  let description = "";
  let name = skillName;
  for (const line of m[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key === "description") description = value;
      else if (key === "name") name = value;
    }
  }
  return { name, description };
}

function buildSkillIndex(role: AuthRole): string | null {
  const allowed = getAllowedSkills(role);
  if (allowed.length === 0) return null;
  const lines: string[] = [
    "# Skill khả dụng",
    "Khi tình huống match một skill bên dưới, bạn PHẢI gọi `read_skill(name)` để đọc body đầy đủ trước khi hành động. Mô tả ở đây chỉ là gợi nhớ, không đủ để theo đúng quy trình.",
    "",
  ];
  let added = 0;
  for (const skillName of allowed) {
    const fm = loadSkillFrontmatter(skillName);
    if (!fm) continue;
    lines.push(`- **${fm.name}** — ${fm.description}`);
    added += 1;
  }
  return added > 0 ? lines.join("\n") : null;
}

function readWorkspaceFile(doctorId: string, name: string): string | null {
  const path = join(AGENT_DIR, "workspaces", doctorId, name);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf8").trim();
  return content || null;
}

function buildSystemPrompt(doctorId: string, role: AuthRole): string {
  const parts = [loadAgentPrompt(role).trim()];
  const skillIndex = buildSkillIndex(role);
  if (skillIndex) parts.push(skillIndex);
  const user = readWorkspaceFile(doctorId, "USER.md");
  const soul = readWorkspaceFile(doctorId, "SOUL.md");
  if (user) parts.push(user);
  if (soul) parts.push(soul);
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
  _doctorId: string,
  role: AuthRole,
  panel: PanelClient
): Promise<string> {
  if (!getAllowedTools(role).has(name)) {
    return JSON.stringify({
      error: `Tool "${name}" không khả dụng cho vai trò "${role}". Yêu cầu bị từ chối ở tầng dispatch.`,
    });
  }
  try {
    switch (name) {
      case "tool_example":
        return await handleToolExample(input);
      case "open_patient_form":
        return await handleOpenPatientForm(input, panel);
      case "submit_patient_form":
        return await handleSubmitPatientForm(input, panel);
      case "read_skill":
        return await handleReadSkill(input, role);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
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
  role: AuthRole,
  panel: PanelClient
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
        role,
        panel
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
