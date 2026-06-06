import {
  computeLab,
  type LabResult,
  type Patient,
  type PatientPublic,
} from "@pr_hospitalagent/types";
import { hashPassword } from "@pr_hospitalagent/api-shared";
import { patientRepo } from "../repositories/patient.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { labCatalogService } from "./labCatalog.service.ts";
import { examRecordService } from "./examRecord.service.ts";
import { BadRequestError, ForbiddenError, NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import type { PatientUpdate, LabInput } from "../schemas/patient.ts";

// Ghi snapshot lịch sử khám sau khi bác sĩ lưu sửa lâm sàng. BEST-EFFORT: lỗi
// snapshot không được làm hỏng thao tác sửa chính (chỉ log, không throw).
async function snapshotHistory(patientId: string, doctorId: string) {
  try {
    const patient = await patientRepo.findById(patientId);
    if (patient) await examRecordService.snapshotFromPatient(patient, doctorId);
  } catch (err) {
    console.error("Ghi lịch sử khám thất bại:", err);
  }
}

const VITAL_DEFAULTS = {
  spO2: 0,
  heartRate: 0,
  bloodPressure: "",
  temperature: 0,
};

// Bác sĩ chỉ sửa phần lâm sàng (vitals xử lý riêng bên dưới). Thông tin cá nhân
// do bệnh nhân tự sửa qua /auth/me/profile; mã BN không ai sửa.
const PATCH_KEYS = ["ward", "diagnoses", "medications"] as const;

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

  // Bệnh nhân tự đăng ký — CHỈ cần SĐT + mật khẩu (SĐT là khoá đăng nhập, không có
  // username). Họ tên/tuổi/giới/địa chỉ để trống → AI thu thập trong chat hoặc BN tự
  // sửa trong cài đặt sau. ward (Khoa) trống → bác sĩ phân khi nhận. Trả full Patient
  // để sign token đăng nhập ngay.
  async register(data: { phone: string; password: string }): Promise<Patient> {
    const id = await patientRepo.nextId();
    const patient: Patient = {
      id,
      passwordHash: hashPassword(data.password),
      name: "",
      age: 0,
      gender: "Nam",
      ward: "",
      address: "",
      phone: data.phone,
      diagnoses: [],
      medications: [],
      vitals: { ...VITAL_DEFAULTS, recordedAt: new Date() },
      labResults: [],
    };
    await patientRepo.insert(patient);
    return patient;
  },

  async update(
    id: string,
    data: PatientUpdate,
    doctorId: string
  ): Promise<PatientPublic> {
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
    await snapshotHistory(id, doctorId);
    return updated!;
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

  async addLab(id: string, input: LabInput, doctorId: string) {
    // Server tự suy đơn vị / khoảng tham chiếu / cờ bất thường từ danh mục (Mongo).
    const entry = (await labCatalogService.findEntry(input.name)) ?? undefined;
    const lab = computeLab(input.name, input.value, entry, input.recordedAt);
    const ok = await patientRepo.pushLab(id, lab);
    if (!ok) throw new NotFoundError(`Không tìm thấy bệnh nhân ${id}`);
    await snapshotHistory(id, doctorId);
    return { ok: true, lab };
  },

  async updateLab(
    id: string,
    indexStr: string,
    input: LabInput,
    doctorId: string
  ) {
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
    // Suy lại đơn vị/khoảng/cờ bất thường từ danh mục; GIỮ thời điểm ghi gốc.
    const entry = (await labCatalogService.findEntry(input.name)) ?? undefined;
    const lab = computeLab(input.name, input.value, entry, labs[idx].recordedAt);
    await patientRepo.replaceLabs(
      id,
      labs.map((l, i) => (i === idx ? lab : l))
    );
    await snapshotHistory(id, doctorId);
    return { ok: true, lab };
  },

  async removeLab(id: string, indexStr: string, doctorId: string) {
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
    await snapshotHistory(id, doctorId);
    return { ok: true, removedIndex: idx };
  },

  async listExamHistory(id: string) {
    return examRecordService.listForPatient(id);
  },
};
