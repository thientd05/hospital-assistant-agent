import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { parseBody } from "../lib/validate.ts";
import { familyService } from "../services/family.service.ts";
import {
  FamilyInviteCreateSchema,
  FamilyRenameSchema,
} from "../schemas/family.ts";
import { UnauthorizedError } from "../lib/errors.ts";

// Tất cả endpoint chỉ dành cho bệnh nhân (id lấy từ JWT).
export async function familyRoutes(app: FastifyInstance) {
  const guard = { preHandler: [verifyAuth, requireRole("patient")] };

  app.get("/me/family", guard, async (req) => {
    if (!req.patient) throw new UnauthorizedError();
    return familyService.getMyFamily(req.patient.id);
  });

  app.patch("/me/family", guard, async (req) => {
    if (!req.patient) throw new UnauthorizedError();
    const { name } = parseBody(FamilyRenameSchema, req.body);
    return familyService.rename(req.patient.id, name);
  });

  app.post("/me/family/leave", guard, async (req) => {
    if (!req.patient) throw new UnauthorizedError();
    return familyService.leave(req.patient.id);
  });

  app.get("/me/family/invites", guard, async (req) => {
    if (!req.patient) throw new UnauthorizedError();
    return familyService.listInvites(req.patient.id);
  });

  app.post("/me/family/invites", guard, async (req) => {
    if (!req.patient) throw new UnauthorizedError();
    const { phone } = parseBody(FamilyInviteCreateSchema, req.body);
    return familyService.invite(req.patient.id, phone);
  });

  app.post<{ Params: { id: string } }>(
    "/me/family/invites/:id/accept",
    guard,
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return familyService.accept(req.patient.id, req.params.id);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/me/family/invites/:id/decline",
    guard,
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return familyService.decline(req.patient.id, req.params.id);
    }
  );

  app.get<{ Params: { memberId: string } }>(
    "/me/family/members/:memberId",
    guard,
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return familyService.getMember(req.patient.id, req.params.memberId);
    }
  );

  app.delete<{ Params: { memberId: string } }>(
    "/me/family/members/:memberId",
    guard,
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return familyService.removeMember(req.patient.id, req.params.memberId);
    }
  );
}
