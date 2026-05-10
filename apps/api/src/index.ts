import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { connectDB } from "./db/client.ts";
import { chatRoutes } from "./routes/chat.ts";
import { conversationsRoutes } from "./routes/conversations.ts";
import { authRoutes } from "./routes/auth.ts";
import { patientsRoutes } from "./routes/patients.ts";
import { doctorsRoutes } from "./routes/doctors.ts";
import { expertsRoutes } from "./routes/experts.ts";
import { appointmentsRoutes } from "./routes/appointments.ts";
import { statsRoutes } from "./routes/stats.ts";
import { drugCheckRoutes } from "./routes/drug-check.ts";
import { skillsRoutes } from "./routes/skills.ts";
import { workspaceRoutes } from "./routes/workspace.ts";
import { assetsRoutes } from "./routes/assets.ts";
import { utilitiesRoutes } from "./routes/utilities.ts";
import { payrollRoutes } from "./routes/payroll.ts";
import { revenueRoutes } from "./routes/revenue.ts";

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
await app.register(patientsRoutes, { prefix: "/api" });
await app.register(doctorsRoutes, { prefix: "/api" });
await app.register(expertsRoutes, { prefix: "/api" });
await app.register(appointmentsRoutes, { prefix: "/api" });
await app.register(statsRoutes, { prefix: "/api" });
await app.register(drugCheckRoutes, { prefix: "/api" });
await app.register(skillsRoutes, { prefix: "/api" });
await app.register(workspaceRoutes, { prefix: "/api" });
await app.register(assetsRoutes, { prefix: "/api" });
await app.register(utilitiesRoutes, { prefix: "/api" });
await app.register(payrollRoutes, { prefix: "/api" });
await app.register(revenueRoutes, { prefix: "/api" });

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
console.log(`API running on http://localhost:${port}`);
