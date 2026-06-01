import { medicationRepo } from "../repositories/medication.repo.ts";

export const medicationService = {
  list: () => medicationRepo.list(),
};
