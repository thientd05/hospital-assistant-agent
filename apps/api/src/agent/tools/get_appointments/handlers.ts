import type { Appointment, Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";
import { DOCTOR_ID_RE } from "../shared.ts";

export async function handleGetAppointments(doctorId: string): Promise<string> {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  const db = await connectDB();
  const appointments = await db
    .collection<Appointment>("appointments")
    .find({ doctorId })
    .sort({ scheduledAt: 1 })
    .toArray();

  const patientIds = Array.from(new Set(appointments.map((a) => a.patientId)));
  const patients = patientIds.length
    ? await db
        .collection<Patient>("patients")
        .find(
          { id: { $in: patientIds } },
          { projection: { id: 1, name: 1, _id: 0 } }
        )
        .toArray()
    : [];
  const nameById = new Map(patients.map((p) => [p.id, p.name]));

  const rows = appointments.map((a) => ({
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

  return JSON.stringify(rows);
}
