import type { FastifyInstance } from "fastify";
import { verifyAuth } from "@pr_hospitalagent/api-shared";
import { LoginSchema, PasswordChangeSchema } from "../schemas/auth.ts";
import { parseBody } from "../lib/validate.ts";
import { authService } from "../services/auth.service.ts";
import { profileService } from "../services/profile.service.ts";
import { passwordService } from "../services/password.service.ts";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req) => {
    const { username, password } = parseBody(LoginSchema, req.body);
    return authService.login(username, password, (payload) =>
      app.jwt.sign(payload, { expiresIn: "24h" })
    );
  });

  app.get("/auth/me", { preHandler: verifyAuth }, async (req) => {
    if (req.authRole === "manager" && req.manager) {
      return { role: "manager" as const, manager: req.manager };
    }
    if (req.authRole === "patient" && req.patient) {
      return { role: "patient" as const, patient: req.patient };
    }
    if (req.authRole === "expert" && req.expert) {
      return { role: "expert" as const, expert: req.expert };
    }
    return { role: "doctor" as const, doctor: req.doctor };
  });

  app.post("/auth/logout", { preHandler: verifyAuth }, async () => ({
    ok: true,
  }));

  app.patch(
    "/auth/me/profile",
    { preHandler: verifyAuth },
    async (req) => {
      const id =
        req.doctor?.id ??
        req.manager?.id ??
        req.expert?.id ??
        req.patient?.id;
      return profileService.updateProfile(req.authRole, id, req.body);
    }
  );

  app.post(
    "/auth/me/password",
    { preHandler: verifyAuth },
    async (req) => {
      const { currentPassword, newPassword } = parseBody(
        PasswordChangeSchema,
        req.body
      );
      const id =
        req.doctor?.id ??
        req.manager?.id ??
        req.expert?.id ??
        req.patient?.id;
      return passwordService.change(
        req.authRole,
        id,
        currentPassword,
        newPassword
      );
    }
  );
}
