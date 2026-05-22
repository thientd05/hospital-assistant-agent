import type { AuthRole } from "@pr_hospitalagent/api-shared";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { managerRepo } from "../repositories/manager.repo.ts";
import { expertRepo } from "../repositories/expert.repo.ts";
import { patientRepo } from "../repositories/patient.repo.ts";
import { UnauthorizedError } from "../lib/errors.ts";
import { assertHasUpdates } from "../lib/patch.ts";
import {
  DoctorProfileSchema,
  ManagerProfileSchema,
  ExpertProfileSchema,
  PatientProfileSchema,
} from "../schemas/auth.ts";
import { parseBody } from "../lib/validate.ts";

export const profileService = {
  async updateProfile(role: AuthRole | undefined, id: string | undefined, body: unknown) {
    if (!role || !id) throw new UnauthorizedError();

    switch (role) {
      case "doctor": {
        const $set = parseBody(DoctorProfileSchema, body);
        assertHasUpdates($set);
        await doctorRepo.patch(id, $set);
        return { role: "doctor" as const, doctor: await doctorRepo.findById(id) };
      }
      case "manager": {
        const $set = parseBody(ManagerProfileSchema, body);
        assertHasUpdates($set);
        await managerRepo.patch(id, $set);
        return { role: "manager" as const, manager: await managerRepo.findById(id) };
      }
      case "expert": {
        const $set = parseBody(ExpertProfileSchema, body);
        assertHasUpdates($set);
        await expertRepo.patch(id, $set);
        return { role: "expert" as const, expert: await expertRepo.findById(id) };
      }
      case "patient": {
        const $set = parseBody(PatientProfileSchema, body);
        assertHasUpdates($set);
        await patientRepo.patch(id, $set);
        const updated = await patientRepo.findById(id);
        return { role: "patient" as const, patient: updated };
      }
    }
  },
};
