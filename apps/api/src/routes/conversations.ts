import type { FastifyInstance, FastifyRequest } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { parseBody } from "../lib/validate.ts";
import { UnauthorizedError } from "../lib/errors.ts";
import { ConversationSaveSchema } from "../schemas/conversation.ts";
import { conversationService } from "../services/conversation.service.ts";
import type { StoredMessage } from "../repositories/conversation.repo.ts";

function ownerId(req: FastifyRequest): string {
  const id = req.doctor?.id ?? req.patient?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

export async function conversationsRoutes(app: FastifyInstance) {
  // === Owner (doctor + patient) ===
  app.get(
    "/conversations",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => conversationService.list(ownerId(req))
  );

  // === Audit (expert, chỉ đọc) ===
  app.get(
    "/conversations/audit",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async () => conversationService.listAudit()
  );

  app.get<{ Params: { id: string } }>(
    "/conversations/audit/:id",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async (req) => conversationService.getAudit(req.params.id)
  );

  // === Nội bộ — agent loop resume (messages thô) ===
  app.get<{ Params: { id: string } }>(
    "/conversations/:id/raw",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => conversationService.getRaw(req.params.id, ownerId(req))
  );

  app.get<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => conversationService.get(req.params.id, ownerId(req))
  );

  // === Nội bộ — agent lưu sau loop (upsert full messages) ===
  app.put<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => {
      const { title, messages } = parseBody(ConversationSaveSchema, req.body);
      return conversationService.save(req.params.id, ownerId(req), {
        title,
        messages: messages as StoredMessage[],
      });
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => conversationService.delete(req.params.id, ownerId(req))
  );
}
