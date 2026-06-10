import type { FastifyInstance } from "fastify";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { runAgentLoop, summarizeSymptoms } from "../agent/loop.ts";
import { getRefreshTarget } from "../agent/tool-refresh-map.ts";
import {
  createPanelClient,
  resolvePanelCommand,
} from "../agent/panel-bridge.ts";
import { bearerToken, requireRole, verifyToken } from "../auth/verify-token.ts";
import {
  fetchConversationRaw,
  saveConversation,
} from "../agent/api-client.ts";

const BodySchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().min(1),
  // Sửa & gửi lại (như ChatGPT/Claude): index lượt user (0-based, CHỈ đếm tin
  // user thật — content là chuỗi, KHÔNG đếm tool_result) cần thay. Lịch sử bị
  // cắt TRƯỚC lượt này; `message` trở thành nội dung mới của lượt đó.
  editUserTurn: z.number().int().min(0).nullish(),
});

type StoredMessage = Anthropic.MessageParam;

// Cắt lịch sử về TRƯỚC lượt user thứ `turn` (0-based). Tin user "thật" = content
// dạng chuỗi (tool_result là content mảng → bỏ qua khi đếm). Không tìm thấy →
// giữ nguyên (không cắt).
function truncateBeforeUserTurn(
  history: StoredMessage[],
  turn: number
): StoredMessage[] {
  let seen = 0;
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === "user" && typeof m.content === "string") {
      if (seen === turn) return history.slice(0, i);
      seen += 1;
    }
  }
  return history;
}

function sse(reply: any, payload: unknown) {
  reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    "/chat",
    {
      preHandler: [verifyToken, requireRole("doctor", "patient")],
    },
    async (req, reply) => {
      const parsed = BodySchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const { conversationId, message, editUserTurn } = parsed.data;
      const ownerId = req.user.sub;
      const role = req.user.role;
      if (role !== "doctor" && role !== "patient") {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const token = bearerToken(req);

      reply.header("Content-Type", "text/event-stream");
      reply.header("Cache-Control", "no-cache");
      reply.header("Connection", "keep-alive");
      reply.hijack();
      for (const [k, v] of Object.entries(reply.getHeaders())) {
        if (v !== undefined) reply.raw.setHeader(k, v as string | string[]);
      }
      reply.raw.writeHead(200);

      let convoId = conversationId ?? undefined;

      try {
        let history: StoredMessage[] = [];
        let existingTitle: string | undefined;
        if (convoId) {
          // Load history qua REST backend (404 → null = hội thoại mới).
          const existing = await fetchConversationRaw(token, convoId);
          if (existing) {
            history = (existing.messages ?? []) as StoredMessage[];
            existingTitle = existing.title;
          }
        }
        // Sửa & gửi lại: cắt lịch sử về trước lượt user được sửa (drop lượt đó +
        // mọi thứ sau nó), rồi `message` mới nối vào như lượt thay thế.
        if (typeof editUserTurn === "number") {
          history = truncateBeforeUserTurn(history, editUserTurn);
        }
        if (!convoId) {
          convoId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }

        const userMsg: StoredMessage = { role: "user", content: message };
        const messages: StoredMessage[] = [...history, userMsg];

        const panel = createPanelClient(ownerId, (frame) => sse(reply, frame));

        const finalMessages = await runAgentLoop(
          messages,
          (text) => sse(reply, { type: "text", content: text }),
          (tc) =>
            sse(reply, {
              type: "tool_call",
              id: tc.id,
              name: tc.name,
              input: tc.input,
              status: tc.status,
              result: tc.result,
              refresh:
                tc.status === "done" ? getRefreshTarget(tc.name) : undefined,
            }),
          role,
          panel,
          token
        );

        sse(reply, { type: "done", conversationId: convoId });

        await saveConversation(token, convoId, {
          title: existingTitle ?? message.slice(0, 60),
          messages: finalMessages as StoredMessage[],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sse(reply, { type: "error", message: msg });
        app.log.error({ err }, "chat handler failed");
      } finally {
        reply.raw.end();
      }
    }
  );

  // Hook đặt lịch (bệnh nhân tự đặt): tổng hợp tóm tắt triệu chứng cho bác sĩ từ
  // hội thoại AI hiện tại. Gọi model MỘT lần và KHÔNG lưu prompt/đáp án vào hội
  // thoại — lượt chat sau của bệnh nhân vẫn tiếp tục như thường. Không có
  // conversationId / hội thoại rỗng → trả "" (chưa có gì để tóm tắt).
  app.post(
    "/chat/summarize",
    { preHandler: [verifyToken, requireRole("doctor", "patient")] },
    async (req, reply) => {
      const parsed = z
        .object({ conversationId: z.string().nullish() })
        .safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body" });
        return;
      }
      const token = bearerToken(req);
      const convoId = parsed.data.conversationId;
      let history: StoredMessage[] = [];
      if (convoId) {
        const existing = await fetchConversationRaw(token, convoId);
        if (existing) history = (existing.messages ?? []) as StoredMessage[];
      }
      const summary = await summarizeSymptoms(history);
      return { summary };
    }
  );

  app.post<{ Params: { commandId: string } }>(
    "/chat/tool-callback/:commandId",
    { preHandler: [verifyToken, requireRole("doctor", "patient")] },
    async (req, reply) => {
      const ownerId = req.user.sub;
      const body = (req.body ?? {}) as { result?: unknown };
      const outcome = resolvePanelCommand(
        req.params.commandId,
        ownerId,
        body.result
      );
      if (outcome === "not-found") {
        reply
          .code(404)
          .send({ error: "Pending command không tồn tại hoặc đã hết hạn." });
        return;
      }
      if (outcome === "wrong-owner") {
        reply.code(403).send({ error: "Sai chủ sở hữu command." });
        return;
      }
      return { ok: true };
    }
  );
}
