import type {
  ExamRecord,
  LabResult,
  PatientPublic,
  Prescription,
  Vital,
} from "@pr_hospitalagent/types";
import { examRecordRepo } from "../repositories/examRecord.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";

// Khoá gộp theo NGÀY (giờ địa phương): "YYYY-MM-DD".
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Khoá so sánh phần LÂM SÀNG của một lần khám (bỏ qua thời điểm ghi). Hai snapshot
// có cùng khoá ⇒ không có thay đổi so với nhau.
function vitalsKey(v: Vital): string {
  return [v.spO2, v.heartRate, v.bloodPressure, v.temperature].join("|");
}
function medsKey(meds: Prescription[]): string {
  return meds.map((m) => `${m.name}=${m.instruction}`).join("§");
}
function labsKey(labs: LabResult[]): string {
  return labs
    .map((l) => `${l.name}=${l.value}|${l.unit}|${l.referenceRange}|${l.isAbnormal}`)
    .join("§");
}
function clinicalKey(c: {
  ward: string;
  diagnoses: string[];
  medications: Prescription[];
  vitals: Vital;
  labResults: LabResult[];
}): string {
  return [
    c.ward,
    c.diagnoses.join("§"),
    medsKey(c.medications),
    vitalsKey(c.vitals),
    labsKey(c.labResults),
  ].join("‖");
}

export type RecordResult =
  | { created: true; record: ExamRecord }
  | { created: false; reason: "no-change" };

export const examRecordService = {
  // Bác sĩ bấm "Ghi nhận" → chốt trạng thái lâm sàng HIỆN TẠI của bệnh nhân thành
  // một lần khám. Chỉ tạo bản ghi MỚI khi khác với lần khám gần nhất; nếu trùng
  // (không có thay đổi) → trả `created:false` để panel báo cho bác sĩ.
  async recordFromPatient(
    patient: PatientPublic,
    doctorId: string
  ): Promise<RecordResult> {
    const current = {
      ward: patient.ward,
      diagnoses: patient.diagnoses ?? [],
      medications: patient.medications ?? [],
      vitals: patient.vitals,
      labResults: patient.labResults ?? [],
    };
    const latest = await examRecordRepo.latestByPatient(patient.id);
    if (latest && clinicalKey(latest) === clinicalKey(current)) {
      return { created: false, reason: "no-change" };
    }
    const doctor = await doctorRepo.findById(doctorId);
    const now = new Date();
    const record = await examRecordRepo.insertSnapshot({
      patientId: patient.id,
      doctorId,
      doctorName: doctor?.fullName ?? doctorId,
      examDate: now,
      day: dayKey(now),
      ...current,
    });
    return { created: true, record };
  },

  async listForPatient(patientId: string): Promise<{
    patientId: string;
    count: number;
    records: ExamRecord[];
  }> {
    const records = await examRecordRepo.listByPatient(patientId);
    return { patientId, count: records.length, records };
  },
};
