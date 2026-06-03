import Anthropic from "@anthropic-ai/sdk";
import {
  getAllowedSkills,
  getAllowedTools,
  type AuthRole,
} from "./access.ts";
import type { PanelClient } from "./panel-bridge.ts";
import { definition as readPanelDef } from "./tools/read_panel/definitions.ts";
import { handleReadPanel } from "./tools/read_panel/handlers.ts";
import { definition as actDef } from "./tools/act/definitions.ts";
import { handleAct } from "./tools/act/handlers.ts";
import { definition as readSkillsDef } from "./tools/read_skills/definitions.ts";
import { handleReadSkills } from "./tools/read_skills/handlers.ts";
import { definition as updateWorkspaceFileDef } from "./tools/update_workspace_file/definitions.ts";
import { handleUpdateWorkspaceFile } from "./tools/update_workspace_file/handlers.ts";
import { fetchWorkspace, fetchBoot, fetchSkills } from "./api-client.ts";

const tools: Anthropic.Tool[] = [
  readPanelDef,
  actDef,
  readSkillsDef,
  updateWorkspaceFileDef,
];

// Index skill = giao của allowlist (config.json, tầng phân quyền agent) và skill
// thực tế có trong Mongo (đọc qua REST). description suy từ frontmatter ở backend.
async function buildSkillIndex(
  token: string,
  role: AuthRole
): Promise<string | null> {
  const allowed = new Set(getAllowedSkills(role));
  if (allowed.size === 0) return null;
  const skills = (await fetchSkills(token)).filter((s) => allowed.has(s.name));
  if (skills.length === 0) return null;
  const lines: string[] = [
    "# Skill khả dụng",
    "Khi tình huống match một (hoặc nhiều) skill bên dưới, bạn PHẢI gọi `read_skills([...])` để đọc body đầy đủ trước khi hành động — một yêu cầu cần nhiều skill thì truyền HẾT tên vào cùng một lần gọi. Mô tả ở đây chỉ là gợi nhớ, không đủ để theo đúng quy trình.",
    "",
  ];
  for (const s of skills) {
    lines.push(`- **${s.name}** — ${s.description}`);
  }
  return lines.join("\n");
}

async function buildSystemPrompt(
  token: string,
  role: AuthRole
): Promise<string> {
  // Boot prompt (AGENT.md), skill index và workspace đều đọc qua REST backend
  // mỗi lượt → áp dụng ngay, agent không chạm Mongo / filesystem.
  const parts = [(await fetchBoot(token, role)).trim()];
  const skillIndex = await buildSkillIndex(token, role);
  if (skillIndex) parts.push(skillIndex);
  const ws = await fetchWorkspace(token);
  const user = ws.user.trim();
  const soul = ws.soul.trim();
  if (user) parts.push(user);
  if (soul) parts.push(soul);
  return parts.join("\n\n---\n\n");
}

const anthropic = new Anthropic();

const MODEL_ID = "claude-haiku-4-5-20251001";

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
  role: AuthRole,
  panel: PanelClient,
  token: string
): Promise<string> {
  if (!getAllowedTools(role).has(name)) {
    return JSON.stringify({
      error: `Tool "${name}" không khả dụng cho vai trò "${role}". Yêu cầu bị từ chối ở tầng dispatch.`,
    });
  }
  try {
    switch (name) {
      case "read_panel":
        return await handleReadPanel(input, panel);
      case "act":
        return await handleAct(input, panel);
      case "read_skills":
        return await handleReadSkills(input, role, token);
      case "update_workspace_file":
        return await handleUpdateWorkspaceFile(input, token);
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
  onChunk: OnChunk,
  onToolCall: OnToolCall,
  role: AuthRole,
  panel: PanelClient,
  token: string
): Promise<Anthropic.MessageParam[]> {
  let working = [...messages];
  const systemPrompt = await buildSystemPrompt(token, role);
  const allowedToolNames = getAllowedTools(role);
  const allowedTools = tools.filter((t) => allowedToolNames.has(t.name));

  while (true) {
    const stream = anthropic.messages.stream({
      model: MODEL_ID,
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
        role,
        panel,
        token
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
