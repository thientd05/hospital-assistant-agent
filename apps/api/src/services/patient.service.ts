import type {
  LabResult,
  Patient,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { hashPassword } from "@pr_hospitalagent/api-shared";
import { patientRepo } from "../repositories/patient.repo.ts";
import { BadRequestError, NotFoundError } from "../lib/errors.ts";
import { buildSet } from "../lib/patch.ts";
import { stripPassword } from "../lib/public.ts";
import type {
  PatientCreate,
  PatientUpdate,
  LabInput,
} from "../schemas/patient.ts";

const VITAL_DEFAULTS = {
  spO2: 0,
  heartRate: 0,
  bloodPressure: "",
  temperature: 0,
};

const PATCH_KEYS = [
  "name",
  "age",
  "gender",
  "ward",
  "diagnoses",
  "medications",
] as const;

export const patientService = {
  list: () => patientRepo.listSummary(),

  async get(id: string): Promise<PatientPublic> {
    const patient = await patientRepo.findById(id);
    if (!patient) {
      throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    }
    return patient;
  },

  async create(data: PatientCreate): Promise<Omit<Patient, "passwordHash">> {
    const id = await patientRepo.nextId();
    const username = id.toLowerCase();
    const password = `matkhau${username}`;
    const patient: Patient = {
      id,
      username,
      passwordHash: hashPassword(password),
      name: data.name,
      age: data.age,
      gender: data.gender,
      ward: data.ward,
      diagnoses: data.diagnoses ?? [],
      medications: data.medications ?? [],
      vitals: {
        ...VITAL_DEFAULTS,
        ...(data.vitals ?? {}),
        recordedAt: new Date(),
      },
      labResults: [],
    };
    await patientRepo.insert(patient);
    return stripPassword(patient);
  },

  async update(id: string, data: PatientUpdate): Promise<PatientPublic> {
    const $set = buildSet(data, PATCH_KEYS);
    if (data.vitals) {
      for (const [k, v] of Object.entries(data.vitals)) {
        $set[`vitals.${k}`] = v;
      }
      $set["vitals.recordedAt"] = new Date();
    }
    if (Object.keys($set).length === 0) {
      throw new BadRequestError("Không có trường nào để cập nhật.");
    }
    const ok = await patientRepo.patch(id, $set);
    if (!ok) throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    const updated = await patientRepo.findById(id);
    return updated!;
  },

  async delete(id: string) {
    const ok = await patientRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    return { ok: true, deleted: id };
  },

  async listLabs(id: string) {
    const patient = await patientRepo.getLabResults(id);
    if (!patient) throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    return {
      patientId: patient.id,
      patientName: patient.name,
      labResults: patient.labResults ?? [],
    };
  },

  async addLab(id: string, input: LabInput) {
    const lab = input as LabResult;
    const ok = await patientRepo.pushLab(id, lab);
    if (!ok) throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    return { ok: true, lab };
  },

  async removeLab(id: string, indexStr: string) {
    const idx = Number(indexStr);
    if (!Number.isInteger(idx) || idx < 0) {
      throw new BadRequestError("index không hợp lệ");
    }
    const patient = await patientRepo.getLabResults(id);
    if (!patient) throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    const labs = patient.labResults ?? [];
    if (idx >= labs.length) {
      throw new NotFoundError(`Lab index ${idx} ngoài phạm vi`);
    }
    await patientRepo.replaceLabs(
      id,
      labs.filter((_, i) => i !== idx)
    );
    return { ok: true, removedIndex: idx };
  },
};
