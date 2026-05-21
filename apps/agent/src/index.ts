import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { chatRoutes } from "./routes/chat.ts";
import { skillsRoutes } from "./routes/skills.ts";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required (set it in .env)");
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: "http://localhost:3000" });
await app.register(jwt, { secret: jwtSecret });

// Agent stateless về DB — không connectDB. Persistence đi qua REST backend.
app.get("/health", async () => ({ status: "ok" }));

await app.register(chatRoutes, { prefix: "/api" });
await app.register(skillsRoutes, { prefix: "/api" });

const port = Number(process.env.AGENT_PORT ?? 3002);
await app.listen({ port, host: "0.0.0.0" });
console.log(`Agent running on http://localhost:${port}`);
