import type { Revenue } from "@pr_hospitalagent/types";
import { revenueRepo } from "../repositories/revenue.repo.ts";
import { NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import type { RevenueCreate, RevenueUpdate } from "../schemas/revenue.ts";

const UPDATE_KEYS = [
  "source",
  "period",
  "amount",
  "patientId",
  "notes",
] as const;

export const revenueService = {
  list: () => revenueRepo.list(),

  async get(id: string) {
    const doc = await revenueRepo.findById(id);
    if (!doc) throw new NotFoundError(`Không tìm thấy doanh thu ${id}`);
    return doc;
  },

  async create(data: RevenueCreate): Promise<Revenue> {
    const id = await revenueRepo.nextId();
    const doc: Revenue = {
      id,
      source: data.source,
      period: data.period,
      amount: data.amount,
      date: new Date(data.date),
      patientId: data.patientId,
      notes: data.notes,
      createdAt: new Date(),
    };
    await revenueRepo.insert(doc);
    return doc;
  },

  async update(id: string, data: RevenueUpdate) {
    const $set = buildSet(data, UPDATE_KEYS);
    if (data.date !== undefined) $set.date = new Date(data.date);
    assertHasUpdates($set);
    const ok = await revenueRepo.patch(id, $set);
    if (!ok) throw new NotFoundError(`Không tìm thấy doanh thu ${id}`);
    return revenueRepo.findById(id);
  },

  async delete(id: string) {
    const ok = await revenueRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy doanh thu ${id}`);
    return { ok: true, deleted: id };
  },
};
