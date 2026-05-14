import type { Asset } from "@pr_hospitalagent/types";
import { assetRepo } from "../repositories/asset.repo.ts";
import { NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import type { AssetCreate, AssetUpdate } from "../schemas/asset.ts";

const UPDATE_KEYS = [
  "name",
  "category",
  "location",
  "purchasePrice",
  "depreciationYears",
  "condition",
  "notes",
] as const;

export const assetService = {
  list: () => assetRepo.list(),

  async get(id: string) {
    const doc = await assetRepo.findById(id);
    if (!doc) throw new NotFoundError(`Không tìm thấy tài sản ${id}`);
    return doc;
  },

  async create(data: AssetCreate): Promise<Asset> {
    const id = await assetRepo.nextId();
    const asset: Asset = {
      id,
      name: data.name,
      category: data.category,
      location: data.location,
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice: data.purchasePrice,
      depreciationYears: data.depreciationYears,
      condition: data.condition,
      notes: data.notes,
      createdAt: new Date(),
    };
    await assetRepo.insert(asset);
    return asset;
  },

  async update(id: string, data: AssetUpdate) {
    const $set = buildSet(data, UPDATE_KEYS);
    if (data.purchaseDate !== undefined) {
      $set.purchaseDate = new Date(data.purchaseDate);
    }
    assertHasUpdates($set);
    const ok = await assetRepo.patch(id, $set);
    if (!ok) throw new NotFoundError(`Không tìm thấy tài sản ${id}`);
    return assetRepo.findById(id);
  },

  async delete(id: string) {
    const ok = await assetRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy tài sản ${id}`);
    return { ok: true, deleted: id };
  },
};
