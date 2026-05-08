import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Expert, ExpertPublic } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";
import { hashPassword } from "../auth/password.ts";

const CreateSchema = z.object({
  fullName: z.string().min(1),
  title: z.string().min(1),
  expertise: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

const UpdateSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    expertise: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
  })
  .strict();

async function nextExpertId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("experts")
    .find({ id: { $regex: "^CG\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^CG(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return "CG" + String(maxNum + 1).padStart(Math.max(3, maxLen), "0");
}

export async function expertsRoutes(app: FastifyInstance) {
  app.get(
    "/experts",
    { preHandler: [verifyAuth, requireRole("manager", "expert")] },
    async () => {
      const db = await connectDB();
      const docs = await db
        .collection<Expert>("experts")
        .find(
          {},
          {
            projection: {
              _id: 0,
              id: 1,
              fullName: 1,
              title: 1,
              expertise: 1,
              phone: 1,
              email: 1,
            },
          }
        )
        .sort({ id: 1 })
        .toArray();
      return { count: docs.length, experts: docs };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/experts/:id",
    { preHandler: [verifyAuth, requireRole("manager", "expert")] },
    async (req, reply) => {
      const db = await connectDB();
      const expert = await db
        .collection<Expert>("experts")
        .findOne(
          { id: req.params.id },
          { projection: { _id: 0, passwordHash: 0 } }
        );
      if (!expert) {
        reply.code(404).send({ error: `Không tìm thấy chuyên gia ${req.params.id}` });
        return;
      }
      return expert as ExpertPublic;
    }
  );

  app.post(
    "/experts",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const id = await nextExpertId();
      const username = data.username ?? id.toLowerCase();
      const password = data.password ?? `matkhau${username}`;
      const db = await connectDB();
      const existing = await db
        .collection<Expert>("experts")
        .findOne({ username });
      if (existing) {
        reply.code(409).send({ error: `Username "${username}" đã tồn tại.` });
        return;
      }
      const expert: Expert = {
        id,
        username,
        passwordHash: hashPassword(password),
        fullName: data.fullName,
        title: data.title,
        expertise: data.expertise,
        phone: data.phone,
        email: data.email,
        address: data.address,
        createdAt: new Date(),
      };
      await db.collection<Expert>("experts").insertOne(expert);
      const { passwordHash, ...rest } = expert;
      return rest;
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/experts/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const $set: Record<string, unknown> = {};
      const data = parsed.data;
      for (const key of [
        "fullName",
        "title",
        "expertise",
        "phone",
        "email",
        "address",
      ] as const) {
        if (data[key] !== undefined) $set[key] = data[key];
      }
      if (data.password) {
        $set.passwordHash = hashPassword(data.password);
      }
      if (Object.keys($set).length === 0) {
        reply.code(400).send({ error: "Không có trường nào để cập nhật." });
        return;
      }
      const db = await connectDB();
      const res = await db
        .collection<Expert>("experts")
        .updateOne({ id: req.params.id }, { $set });
      if (res.matchedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy chuyên gia ${req.params.id}` });
        return;
      }
      const updated = await db
        .collection<Expert>("experts")
        .findOne(
          { id: req.params.id },
          { projection: { _id: 0, passwordHash: 0 } }
        );
      return updated as ExpertPublic;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/experts/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const res = await db
        .collection<Expert>("experts")
        .deleteOne({ id: req.params.id });
      if (res.deletedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy chuyên gia ${req.params.id}` });
        return;
      }
      return { ok: true, deleted: req.params.id };
    }
  );
}
