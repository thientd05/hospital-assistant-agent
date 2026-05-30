import type { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import type { AuthRole } from "@pr_hospitalagent/api-shared";

// Cơ chế 2-token, MỖI loại một secret riêng:
//   - access  : ký/verify bằng JWT_SECRET (decorator mặc định app.jwt.*), sống 10 phút.
//   - refresh : ký/verify bằng JWT_REFRESH_SECRET (namespace "refresh"), sống 2 tiếng.
// Tách secret → refresh token gửi nhầm vào route thường sẽ FAIL chữ ký ngay
// (khác key), không cần dựa vào claim type.
const ACCESS_TTL = "10m";
const REFRESH_TTL = "2h";

type TokenPayload = { sub: string; role: AuthRole; type: "access" | "refresh" };
type DecodedToken = TokenPayload & { iat: number; exp: number };

declare module "fastify" {
  interface FastifyInstance {
    signAccessToken(payload: { sub: string; role: AuthRole }): string;
    signRefreshToken(payload: { sub: string; role: AuthRole }): string;
    verifyRefreshToken(token: string): DecodedToken;
  }
}

export async function registerJwt(
  app: FastifyInstance,
  accessSecret: string,
  refreshSecret: string
) {
  // Mặc định (access): app.jwt.sign / request.jwtVerify dùng accessSecret.
  await app.register(jwt, { secret: accessSecret });
  // Namespace refresh: app.jwt.refresh.* dùng refreshSecret.
  await app.register(jwt, {
    secret: refreshSecret,
    namespace: "refresh",
    jwtVerify: "refreshJwtVerify",
    jwtSign: "refreshJwtSign",
  });

  // @fastify/jwt tạo app.jwt.refresh ở runtime nhưng KHÔNG type hoá namespace —
  // ép kiểu cục bộ tại đây, phần còn lại của codebase dùng helper đã typed.
  const refreshJwt = (
    app.jwt as unknown as {
      refresh: {
        sign(payload: TokenPayload, opts?: { expiresIn?: string }): string;
        verify<T>(token: string): T;
      };
    }
  ).refresh;

  app.decorate("signAccessToken", (payload: { sub: string; role: AuthRole }) =>
    app.jwt.sign({ ...payload, type: "access" }, { expiresIn: ACCESS_TTL })
  );
  app.decorate("signRefreshToken", (payload: { sub: string; role: AuthRole }) =>
    refreshJwt.sign({ ...payload, type: "refresh" }, { expiresIn: REFRESH_TTL })
  );
  app.decorate("verifyRefreshToken", (token: string) =>
    refreshJwt.verify<DecodedToken>(token)
  );
}
