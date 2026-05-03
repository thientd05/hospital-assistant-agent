import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { connectDB } from "./db/client.ts";
import { chatRoutes } from "./routes/chat.ts";
import { conversationsRoutes } from "./routes/conversations.ts";
import { authRoutes } from "./routes/auth.ts";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required (set it in .env)");
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: "http://localhost:3000" });
await app.register(jwt, { secret: jwtSecret });

await connectDB();

app.get("/health", async () => ({ status: "ok", db: "connected" }));

await app.register(authRoutes, { prefix: "/api" });
await app.register(chatRoutes, { prefix: "/api" });
await app.register(conversationsRoutes, { prefix: "/api" });

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
console.log(`API running on http://localhost:${port}`);
