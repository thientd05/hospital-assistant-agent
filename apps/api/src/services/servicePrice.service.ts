import { servicePriceRepo } from "../repositories/servicePrice.repo.ts";

export const servicePriceService = {
  list: () => servicePriceRepo.list(),
};
