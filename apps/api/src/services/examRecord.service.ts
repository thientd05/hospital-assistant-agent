import type { ExamRecord, PatientPublic } from "@pr_hospitalagent/types";
import { examRecordRepo } from "../repositories/examRecord.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";

// Khoá gộp theo NGÀY (giờ địa phương): "YYYY-MM-DD".
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export const examRecordService = {
  // Ghi/cập nhật snapshot lịch sử khám từ trạng thái lâm sàng HIỆN TẠI của bệnh
  // nhân (gọi sau mỗi lần bác sĩ lưu sửa). Best-effort: lỗi snapshot KHÔNG được
  // làm hỏng thao tác sửa chính (caller bọc try/catch).
  async snapshotFromPatient(patient: PatientPublic, doctorId: string) {
    const doctor = await doctorRepo.findById(doctorId);
    const now = new Date();
    return examRecordRepo.upsertSnapshot({
      patientId: patient.id,
      doctorId,
      doctorName: doctor?.fullName ?? doctorId,
      examDate: now,
      day: dayKey(now),
      ward: patient.ward,
      diagnoses: patient.diagnoses ?? [],
      medications: patient.medications ?? [],
      vitals: patient.vitals,
      labResults: patient.labResults ?? [],
    });
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
