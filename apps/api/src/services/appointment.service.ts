import type { Appointment } from "@pr_hospitalagent/types";
import { appointmentRepo } from "../repositories/appointment.repo.ts";
import { patientRepo } from "../repositories/patient.repo.ts";
import {
  ForbiddenError,
  NotFoundError,
} from "../lib/errors.ts";
import type {
  AppointmentCreate,
  AppointmentUpdate,
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
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

export const appointmentService = {
  async list(doctorId?: string) {
    const rows = await appointmentRepo.list(doctorId);
    return joinPatientNames(rows);
  },

  async create(
    requesterId: string,
    data: AppointmentCreate
  ): Promise<Appointment> {
    const doctorId = data.doctorId ?? requesterId;
    if (doctorId !== requesterId) {
      throw new ForbiddenError("Bác sĩ chỉ tạo được lịch cho chính mình.");
    }
    const patient = await patientRepo.findById(data.patientId);
    if (!patient) {
      throw new NotFoundError(`Không tìm thấy bệnh nhân ${data.patientId}`);
    }
    const id = await appointmentRepo.nextId();
    const now = new Date();
    const appointment: Appointment = {
      id,
      patientId: data.patientId,
      doctorId,
      scheduledAt:
        data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt),
      reason: data.reason,
      status: data.status ?? "Chờ duyệt",
      createdAt: now,
      updatedAt: now,
    };
    await appointmentRepo.insert(appointment);
    return appointment;
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
