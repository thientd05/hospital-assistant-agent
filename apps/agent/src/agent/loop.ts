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
import { definition as readServicePricesDef } from "./tools/read_service_prices/definitions.ts";
import { handleReadServicePrices } from "./tools/read_service_prices/handlers.ts";
import { definition as readExamHistoryDef } from "./tools/read_exam_history/definitions.ts";
import { handleReadExamHistory } from "./tools/read_exam_history/handlers.ts";
import { fetchWorkspace, fetchBoot, fetchSkills } from "./api-client.ts";

const tools: Anthropic.Tool[] = [
  readPanelDef,
  actDef,
  readSkillsDef,
  updateWorkspaceFileDef,
  readServicePricesDef,
  readExamHistoryDef,
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

// Tách system prompt thành 2 mảnh để thân thiện prompt-cache:
//  - `stable`: boot + skill index + USER + SOUL — gần như bất biến trong một cuộc
//    trò chuyện → mang cache breakpoint, được cache độc lập.
//  - `memory`: MEMORY.md — agent có thể TỰ cập nhật (bài học khi mắc lỗi). Đặt
//    SAU `stable` và KHÔNG mang breakpoint riêng: khi memory đổi, mảnh `stable`
//    vẫn hit cache, chỉ phần memory (nhỏ) + tools + messages phải xử lý lại.
// Cả hai đọc qua REST mỗi lượt → cập nhật memory ở lượt này tự hiện ở lượt sau.
async function buildSystemPrompt(
  token: string,
  role: AuthRole
): Promise<{ stable: string; memory: string }> {
  const parts = [(await fetchBoot(token, role)).trim()];
  const skillIndex = await buildSkillIndex(token, role);
  if (skillIndex) parts.push(skillIndex);
  const ws = await fetchWorkspace(token);
  const user = ws.user.trim();
  const soul = ws.soul.trim();
  if (user) parts.push(user);
  if (soul) parts.push(soul);
  const memory = ws.memory.trim();
  const memoryBlock = memory
    ? `# MEMORY — bài học đã rút ra, LUÔN áp dụng\n\n${memory}`
    : "";
  return { stable: parts.join("\n\n---\n\n"), memory: memoryBlock };
}

const anthropic = new Anthropic();

// Đổi model ở đây khi cần — chỉ việc thay chuỗi bên dưới bằng 1 trong các ID:
//   "claude-opus-4-8"            // Opus 4.8 — mạnh nhất
//   "claude-sonnet-4-6"          // Sonnet 4.6 — cân bằng tốc độ/chi phí
//   "claude-haiku-4-5-20251001"  // Haiku 4.5 — nhanh & rẻ nhất
const MODEL_ID = "claude-haiku-4-5-20251001";

// Lời nhắc tóm tắt triệu chứng cho bác sĩ — dùng ở hook đặt lịch (bệnh nhân tự
// đặt). KHÔNG lưu vào hội thoại: gọi một lần, lấy text, bỏ đi.
const SUMMARY_INSTRUCTION = `Dựa trên cuộc trò chuyện ở trên giữa bạn (trợ lý ảo) và bệnh nhân, hãy viết một đoạn TÓM TẮT NGẮN GỌN, KHÁCH QUAN về triệu chứng và tình trạng của bệnh nhân để bác sĩ nắm nhanh trước khi khám.

Quy tắc:
- Viết ngôi thứ ba ("Bệnh nhân than…"), 1–3 câu, tiếng Việt.
- CHỈ dựa trên điều bệnh nhân đã nói; KHÔNG bịa, KHÔNG tự chẩn đoán.
- Nếu cuộc trò chuyện CHƯA đủ thông tin về triệu chứng/tình trạng để tóm tắt, chỉ trả về đúng dòng: "Chưa có tóm tắt".
- Chỉ trả về đoạn tóm tắt (hoặc "Chưa có tóm tắt"), không thêm lời dẫn, không markdown.`;

// Rút lịch sử hội thoại về các lượt CHỈ-TEXT (bỏ tool_use/tool_result — gọi tóm
// tắt không khai báo tools nên không gửi kèm các block đó), gộp lượt liên tiếp
// cùng vai để giữ xen kẽ user/assistant hợp lệ.
function toTextTurns(
  messages: Anthropic.MessageParam[]
): { role: "user" | "assistant"; content: string }[] {
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    const text =
      typeof m.content === "string"
        ? m.content
        : m.content
            .filter((b): b is Anthropic.TextBlockParam => b.type === "text")
            .map((b) => b.text)
            .join("\n");
    const trimmed = text.trim();
    if (!trimmed) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + trimmed;
    else merged.push({ role: m.role, content: trimmed });
  }
  return merged;
}

// Tóm tắt triệu chứng từ lịch sử hội thoại bằng MỘT lần gọi model (không tool,
// không lưu). History rỗng/không có nội dung text → "" (chưa có gì để tóm tắt).
export async function summarizeSymptoms(
  history: Anthropic.MessageParam[]
): Promise<string> {
  const convo = toTextTurns(history);
  // API yêu cầu message đầu là user → bỏ assistant dẫn đầu nếu có.
  while (convo.length && convo[0]!.role === "assistant") convo.shift();
  if (convo.length === 0) return "";
  // Nối lời nhắc tóm tắt dưới vai user (gộp nếu lượt cuối đã là user).
  const last = convo[convo.length - 1]!;
  if (last.role === "user") last.content += "\n\n" + SUMMARY_INSTRUCTION;
  else convo.push({ role: "user", content: SUMMARY_INSTRUCTION });
  const res = await anthropic.messages.create({
    model: MODEL_ID,
    max_tokens: 512,
    messages: convo,
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

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
      case "read_service_prices":
        return await handleReadServicePrices(token);
      case "read_exam_history":
        return await handleReadExamHistory(input, token);
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
  const { stable, memory } = await buildSystemPrompt(token, role);
  // `stable` mang breakpoint (được cache độc lập). `memory` nối SAU, không có
  // breakpoint riêng → đổi memory không làm hỏng cache của `stable`.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: stable, cache_control: EPHEMERAL },
  ];
  if (memory) systemBlocks.push({ type: "text", text: memory });
  const allowedToolNames = getAllowedTools(role);
  const allowedTools = tools.filter((t) => allowedToolNames.has(t.name));

  while (true) {
    const stream = anthropic.messages.stream({
      model: MODEL_ID,
      max_tokens: 8192,
      system: systemBlocks,
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
