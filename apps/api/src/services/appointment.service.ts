import type { Appointment } from "@pr_hospitalagent/types";
import { appointmentRepo } from "../repositories/appointment.repo.ts";
import type { AppointmentListFilter } from "../repositories/appointment.repo.ts";
import { patientRepo } from "../repositories/patient.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../lib/errors.ts";
import type {
  AppointmentUpdate,
  AppointmentPatientCreate,
} from "../schemas/appointment.ts";

async function joinPatientNames(rows: Appointment[]) {
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((r) => r.patientId)));
  const patients = await Promise.all(ids.map((id) => patientRepo.findById(id)));
  const nameById = new Map(
    patients
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => [p.id, p.name])
  );
  return rows.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    patientName: nameById.get(a.patientId) ?? null,
    doctorId: a.doctorId,
    scheduledAt: a.scheduledAt,
    reason: a.reason,
    patientNote: a.patientNote ?? "",
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

export const appointmentService = {
  async list(filter: AppointmentListFilter = {}) {
    const rows = await appointmentRepo.list(filter);
    return joinPatientNames(rows);
  },

  // Bệnh nhân tự đặt lịch. doctorId rỗng/không truyền → hàng chờ chung ("").
  async createForPatient(
    patientId: string,
    data: AppointmentPatientCreate
  ): Promise<Appointment> {
    let doctorId = "";
    if (data.doctorId) {
      const doctor = await doctorRepo.findById(data.doctorId);
      if (!doctor) {
        throw new NotFoundError(`Không tìm thấy bác sĩ ${data.doctorId}`);
      }
      doctorId = doctor.id;
    }
    const id = await appointmentRepo.nextId();
    const now = new Date();
    const appointment: Appointment = {
      id,
      patientId,
      doctorId,
      scheduledAt:
        data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt),
      reason: data.reason,
      patientNote: data.patientNote?.trim() || "",
      status: "Chờ duyệt",
      createdAt: now,
      updatedAt: now,
    };
    await appointmentRepo.insert(appointment);
    return appointment;
  },

  // Bác sĩ duyệt một lịch "Chờ duyệt": nếu là lịch hàng chờ chung thì giành nguyên tử
  // (ai trước được trước) + nhận BN vào danh sách quản lý.
  async accept(doctorId: string, id: string) {
    const existing = await appointmentRepo.findById(id);
    if (!existing) throw new NotFoundError(`Không tìm thấy lịch hẹn ${id}`);
    if (existing.status !== "Chờ duyệt") {
      throw new BadRequestError("Lịch hẹn không ở trạng thái Chờ duyệt.");
    }
    if (existing.doctorId === "") {
      const won = await appointmentRepo.claim(id, doctorId);
      if (!won) throw new ConflictError("Lịch đã được bác sĩ khác nhận.");
    } else if (existing.doctorId === doctorId) {
      await appointmentRepo.patch(id, {
        status: "Đã duyệt",
        updatedAt: new Date(),
      });
    } else {
      throw new ForbiddenError("Lịch hẹn này được gửi cho bác sĩ khác.");
    }
    await doctorRepo.addManagedPatient(doctorId, existing.patientId);
    return appointmentRepo.findById(id);
  },

  async update(requesterId: string, id: string, data: AppointmentUpdate) {
    const existing = await appointmentRepo.findById(id);
    if (!existing) throw new NotFoundError(`Không tìm thấy lịch hẹn ${id}`);
    if (existing.doctorId !== requesterId) {
      throw new ForbiddenError("Không phải lịch hẹn của bạn.");
    }
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (data.patientId !== undefined) $set.patientId = data.patientId;
    if (data.reason !== undefined) $set.reason = data.reason;
    if (data.patientNote !== undefined) $set.patientNote = data.patientNote;
    if (data.status !== undefined) $set.status = data.status;
    if (data.scheduledAt !== undefined) {
      $set.scheduledAt =
        data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt);
    }
    return appointmentRepo.patch(id, $set);
  },

  async delete(requesterId: string, id: string) {
    const existing = await appointmentRepo.findById(id);
    if (!existing) throw new NotFoundError(`Không tìm thấy lịch hẹn ${id}`);
    if (existing.doctorId !== requesterId) {
      throw new ForbiddenError("Không phải lịch hẹn của bạn.");
    }
    await appointmentRepo.delete(id);
    return { ok: true, deleted: id };
  },
};
