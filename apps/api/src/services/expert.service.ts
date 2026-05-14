import type { Expert, ExpertPublic } from "@pr_hospitalagent/types";
import { hashPassword } from "@pr_hospitalagent/api-shared";
import { expertRepo } from "../repositories/expert.repo.ts";
import { ConflictError, NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import { stripPassword } from "../lib/public.ts";
import type { ExpertCreate, ExpertUpdate } from "../schemas/expert.ts";

const UPDATE_KEYS = [
  "fullName",
  "title",
  "expertise",
  "phone",
  "email",
  "address",
] as const;

export const expertService = {
  list: () => expertRepo.listSummary(),

  async get(id: string): Promise<ExpertPublic> {
    const expert = await expertRepo.findById(id);
    if (!expert) throw new NotFoundError(`Không tìm thấy chuyên gia ${id}`);
    return expert;
  },

  async create(data: ExpertCreate): Promise<Omit<Expert, "passwordHash">> {
    const id = await expertRepo.nextId();
    const username = data.username ?? id.toLowerCase();
    const password = data.password ?? `matkhau${username}`;
    if (await expertRepo.findByUsername(username)) {
      throw new ConflictError(`Username "${username}" đã tồn tại.`);
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
    await expertRepo.insert(expert);
    return stripPassword(expert);
  },

  async update(id: string, data: ExpertUpdate): Promise<ExpertPublic> {
    const $set = buildSet(data, UPDATE_KEYS);
    if (data.password) $set.passwordHash = hashPassword(data.password);
    assertHasUpdates($set);
    const ok = await expertRepo.patch(id, $set);
    if (!ok) throw new NotFoundError(`Không tìm thấy chuyên gia ${id}`);
    return (await expertRepo.findById(id))!;
  },

  async delete(id: string) {
    const ok = await expertRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy chuyên gia ${id}`);
    return { ok: true, deleted: id };
  },
};
