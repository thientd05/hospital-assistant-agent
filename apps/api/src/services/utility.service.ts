import type { Utility } from "@pr_hospitalagent/types";
import { utilityRepo } from "../repositories/utility.repo.ts";
import { NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import type { UtilityCreate, UtilityUpdate } from "../schemas/utility.ts";

const UPDATE_KEYS = [
  "type",
  "period",
  "amount",
  "usage",
  "unit",
  "status",
  "notes",
] as const;

export const utilityService = {
  list: () => utilityRepo.list(),

  async get(id: string) {
    const doc = await utilityRepo.findById(id);
    if (!doc) throw new NotFoundError(`Không tìm thấy hoá đơn ${id}`);
    return doc;
  },

  async create(data: UtilityCreate): Promise<Utility> {
    const id = await utilityRepo.nextId();
    const doc: Utility = {
      id,
      type: data.type,
      period: data.period,
      amount: data.amount,
      usage: data.usage,
      unit: data.unit,
      paidDate: data.paidDate ? new Date(data.paidDate) : null,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(),
    };
    await utilityRepo.insert(doc);
    return doc;
  },

  async update(id: string, data: UtilityUpdate) {
    const $set = buildSet(data, UPDATE_KEYS);
    if (data.paidDate !== undefined) {
      $set.paidDate = data.paidDate ? new Date(data.paidDate) : null;
    }
    assertHasUpdates($set);
    const ok = await utilityRepo.patch(id, $set);
    if (!ok) throw new NotFoundError(`Không tìm thấy hoá đơn ${id}`);
    return utilityRepo.findById(id);
  },

  async delete(id: string) {
    const ok = await utilityRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy hoá đơn ${id}`);
    return { ok: true, deleted: id };
  },
};
