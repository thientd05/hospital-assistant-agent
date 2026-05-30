import type { FastifyInstance } from "fastify";
import type { AuthRole } from "@pr_hospitalagent/api-shared";
import { verifyAuth } from "@pr_hospitalagent/api-shared";
import {
  LoginSchema,
  PasswordChangeSchema,
  RefreshSchema,
  RegisterSchema,
} from "../schemas/auth.ts";
import { parseBody } from "../lib/validate.ts";
import { UnauthorizedError } from "../lib/errors.ts";
import { authService } from "../services/auth.service.ts";
import { profileService } from "../services/profile.service.ts";
import { passwordService } from "../services/password.service.ts";

export async function authRoutes(app: FastifyInstance) {
  // Cặp token: access (JWT_SECRET, 10') + refresh (JWT_REFRESH_SECRET, 2h).
  // TTL/secret nằm trong plugins/jwt.ts; route chỉ gọi helper đã typed.
  const signTokens = (payload: { sub: string; role: AuthRole }) => ({
    token: app.signAccessToken(payload),
    refreshToken: app.signRefreshToken(payload),
  });

  app.post("/auth/login", async (req) => {
    const { username, password } = parseBody(LoginSchema, req.body);
    return authService.login(username, password, signTokens);
  });

  // Đăng ký công khai — chỉ tạo tài khoản bệnh nhân.
  app.post("/auth/register", async (req) => {
    const data = parseBody(RegisterSchema, req.body);
    return authService.register(data, signTokens);
  });

  // Đổi refresh token (còn hạn) lấy access token mới. KHÔNG xoay refresh —
  // refresh hết hạn 2h thì người dùng phải đăng nhập lại. Verify bằng
  // JWT_REFRESH_SECRET → access token gửi nhầm vào đây sẽ FAIL chữ ký.
  app.post("/auth/refresh", async (req) => {
    const { refreshToken } = parseBody(RefreshSchema, req.body);
    let decoded: { sub: string; role: AuthRole; type?: string };
    try {
      decoded = app.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError(
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
      );
    }
    if (decoded.type !== "refresh") {
      throw new UnauthorizedError("Token không hợp lệ.");
    }
    const token = app.signAccessToken({ sub: decoded.sub, role: decoded.role });
    return { token };
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
