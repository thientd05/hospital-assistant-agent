export function loadEnv() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required (set it in .env)");
  }
  // Secret RIÊNG cho refresh token (cơ chế 2-token) — phải khác JWT_SECRET.
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is required (set it in .env)");
  }
  const port = Number(process.env.PORT ?? 3001);
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  return { jwtSecret, jwtRefreshSecret, port, corsOrigin };
}

export type Env = ReturnType<typeof loadEnv>;
