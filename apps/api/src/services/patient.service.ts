import type {
  LabResult,
  Patient,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { hashPassword } from "@pr_hospitalagent/api-shared";
import { patientRepo } from "../repositories/patient.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { BadRequestError, ForbiddenError, NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import { stripPassword } from "../lib/public.ts";
import type {
  PatientCreate,
  PatientUpdate,
  LabInput,
  HomeVitalInput,
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
  "address",
  "phone",
  "diagnoses",
  "medications",
] as const;

export const patientService = {
  // doctorId có → chỉ BN bác sĩ đó quản lý; không có (manager) → toàn bộ.
  async list(scope?: { doctorId?: string }) {
    if (scope?.doctorId) {
      const ids = await doctorRepo.getManagedIds(scope.doctorId);
      return patientRepo.listSummaryByIds(ids);
    }
    return patientRepo.listSummary();
  },

  // Chặn bác sĩ thao tác trên BN không thuộc phạm vi quản lý của mình.
  async assertManagedBy(doctorId: string, patientId: string) {
    const ids = await doctorRepo.getManagedIds(doctorId);
    if (!ids.includes(patientId)) {
      throw new ForbiddenError("Bệnh nhân không thuộc danh sách bạn quản lý.");
    }
  },

  async get(id: string): Promise<PatientPublic> {
    const patient = await patientRepo.findById(id);
    if (!patient) {
      throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    }
    return patient;
  },

  async create(
    data: PatientCreate,
    creatingDoctorId?: string
  ): Promise<Omit<Patient, "passwordHash">> {
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
      address: data.address ?? "",
      phone: data.phone ?? "",
      diagnoses: data.diagnoses ?? [],
      medications: data.medications ?? [],
      vitals: {
        ...VITAL_DEFAULTS,
        ...(data.vitals ?? {}),
        recordedAt: new Date(),
      },
      labResults: [],
      homeVitals: [],
    };
    await patientRepo.insert(patient);
    // Bác sĩ tạo BN thì quản lý BN đó luôn.
    if (creatingDoctorId) {
      await doctorRepo.addManagedPatient(creatingDoctorId, id);
    }
    return stripPassword(patient);
  },

  // Bệnh nhân tự đăng ký — username/password do BN chọn, chưa có bác sĩ quản lý.
  // ward (Khoa) để trống — bác sĩ phân khoa khi nhận. Trả full Patient để sign token ngay.
  async register(data: {
    username: string;
    password: string;
    name: string;
    age: number;
    gender: "Nam" | "Nữ";
    address: string;
    phone: string;
  }): Promise<Patient> {
    const id = await patientRepo.nextId();
    const patient: Patient = {
      id,
      username: data.username,
      passwordHash: hashPassword(data.password),
      name: data.name,
      age: data.age,
      gender: data.gender,
      ward: "",
      address: data.address,
      phone: data.phone,
      diagnoses: [],
      medications: [],
      vitals: { ...VITAL_DEFAULTS, recordedAt: new Date() },
      labResults: [],
      homeVitals: [],
    };
    await patientRepo.insert(patient);
    return patient;
  },

  async update(id: string, data: PatientUpdate): Promise<PatientPublic> {
    const $set = buildSet(data, PATCH_KEYS);
    if (data.vitals) {
      for (const [k, v] of Object.entries(data.vitals)) {
        $set[`vitals.${k}`] = v;
      }
      $set["vitals.recordedAt"] = new Date();
    }
    assertHasUpdates($set);
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

  // Chỉ số tại nhà — bệnh nhân tự đọc/ghi (id lấy từ JWT ở route).
  async listHomeVitals(patientId: string) {
    const doc = await patientRepo.getHomeVitals(patientId);
    if (!doc) throw new NotFoundError(`Không tìm thấy bệnh nhân ${patientId}`);
    return {
      patientId: doc.id,
      vitals: doc.vitals ?? null,
      homeVitals: doc.homeVitals ?? [],
    };
  },

  async addHomeVital(patientId: string, input: HomeVitalInput) {
    const entry = { ...input, recordedAt: new Date() };
    const ok = await patientRepo.pushHomeVital(patientId, entry);
    if (!ok) throw new NotFoundError(`Không tìm thấy bệnh nhân ${patientId}`);
    return { ok: true, homeVital: entry };
  },
};
