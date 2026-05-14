import { patientRepo } from "../../repositories/patient.repo.ts";
import { appointmentRepo } from "../../repositories/appointment.repo.ts";
import { doctorRepo } from "../../repositories/doctor.repo.ts";

function ageBucket(age: number): "0-17" | "18-39" | "40-59" | "60+" {
  if (age <= 17) return "0-17";
  if (age <= 39) return "18-39";
  if (age <= 59) return "40-59";
  return "60+";
}

export const customersStatsService = {
  async build(opts: { topDiagnoses: number; topWards: number }) {
    const patients = await patientRepo.listAll();

    const byGender: Record<string, number> = {};
    const byAgeGroup: Record<"0-17" | "18-39" | "40-59" | "60+", number> = {
      "0-17": 0,
      "18-39": 0,
      "40-59": 0,
      "60+": 0,
    };
    const wardCount = new Map<string, number>();
    const diagCount = new Map<string, number>();
    let withAbnormalLab = 0;

    for (const p of patients) {
      byGender[p.gender] = (byGender[p.gender] ?? 0) + 1;
      byAgeGroup[ageBucket(p.age)] += 1;
      if (p.ward) wardCount.set(p.ward, (wardCount.get(p.ward) ?? 0) + 1);
      for (const d of p.diagnoses ?? []) {
        diagCount.set(d, (diagCount.get(d) ?? 0) + 1);
      }
      if ((p.labResults ?? []).some((l) => l.isAbnormal)) {
        withAbnormalLab += 1;
      }
    }

    const byWard = Array.from(wardCount.entries())
      .map(([ward, count]) => ({ ward, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, opts.topWards);

    const topDiagnoses = Array.from(diagCount.entries())
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, opts.topDiagnoses);

    const appointments = await appointmentRepo.listAll();

    const apptByStatus: Record<string, number> = {};
    const apptByDoctor = new Map<string, number>();
    for (const a of appointments) {
      apptByStatus[a.status] = (apptByStatus[a.status] ?? 0) + 1;
      apptByDoctor.set(a.doctorId, (apptByDoctor.get(a.doctorId) ?? 0) + 1);
    }

    const doctors = await doctorRepo.listByIds(Array.from(apptByDoctor.keys()));
    const nameById = new Map(doctors.map((d) => [d.id, d.fullName]));

    const byDoctor = Array.from(apptByDoctor.entries())
      .map(([doctorId, count]) => ({
        doctorId,
        doctorName: nameById.get(doctorId) ?? null,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      patients: {
        total: patients.length,
        byGender,
        byAgeGroup,
        byWard,
        topDiagnoses,
        withAbnormalLab,
      },
      appointments: {
        total: appointments.length,
        byStatus: apptByStatus,
        byDoctor,
      },
    };
  },
};
