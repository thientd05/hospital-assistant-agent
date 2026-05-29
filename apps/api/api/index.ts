// Vercel serverless entry cho REST API.
// `vercel-build` (esbuild) bundle toàn bộ src + workspace package (.ts thô) thành
// dist/app.js. Ở đây ta build Fastify app MỘT LẦN (cache qua warm invocation) rồi
// forward request thô vào nó. KHÔNG gọi .listen — Vercel quản lý vòng đời socket.
import type { IncomingMessage, ServerResponse } from "node:http";
// dist/app.js chỉ tồn tại sau khi chạy vercel-build (gitignored) — editor sẽ báo
// thiếu file, nhưng trên Vercel buildCommand chạy trước khi transpile file này.
// @ts-expect-error sinh lúc build
import { buildApp } from "../dist/app.js";

let ready: Promise<import("fastify").FastifyInstance> | null = null;

function getApp() {
  if (!ready) {
    ready = buildApp().then(async ({ app }: { app: import("fastify").FastifyInstance }) => {
      await app.ready();
      return app;
    });
  }
  return ready!;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
