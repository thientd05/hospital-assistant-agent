import { labCatalogRepo } from "../repositories/labCatalog.repo.ts";

export const labCatalogService = {
  list: () => labCatalogRepo.list(),
  findEntry: (name: string) => labCatalogRepo.findByName(name),
};
