// Vercel serverless entry cho Agent service.
// `vercel-build` (esbuild) bundle src thành dist/app.js và copy boots/ + skills/
// vào dist/ (vì loop.ts & skills-fs.ts neo asset theo import.meta.dirname — sau khi
// bundle, dirname = dist/). Ở đây build app MỘT LẦN rồi forward request thô.
// KHÔNG .listen — Vercel quản lý vòng đời socket.
import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-expect-error dist/app.js sinh lúc build (gitignored)
import { buildAgentApp } from "../dist/app.js";

let ready: Promise<import("fastify").FastifyInstance> | null = null;

function getApp() {
  if (!ready) {
    ready = buildAgentApp().then(
      async ({ app }: { app: import("fastify").FastifyInstance }) => {
        await app.ready();
        return app;
      }
    );
  }
  return ready!;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
