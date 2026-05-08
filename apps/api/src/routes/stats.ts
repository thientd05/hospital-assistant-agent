import type { FastifyInstance } from "fastify";
import type { Appointment, Doctor, Patient } from "@pr_hospitalagent/types";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";
import { connectDB } from "../db/client.ts";

function ageBucket(age: number): "0-17" | "18-39" | "40-59" | "60+" {
  if (age <= 17) return "0-17";
  if (age <= 39) return "18-39";
  if (age <= 59) return "40-59";
  return "60+";
}

export async function statsRoutes(app: FastifyInstance) {
  app.get(
    "/stats/customers",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => {
      const q = req.query as Record<string, unknown>;
      const topDiagN =
        typeof q.topDiagnoses === "string" && Number(q.topDiagnoses) > 0
          ? Math.floor(Number(q.topDiagnoses))
          : 10;
      const topWardsN =
        typeof q.topWards === "string" && Number(q.topWards) > 0
          ? Math.floor(Number(q.topWards))
          : 10;

      const db = await connectDB();

      const patients = await db
        .collection<Patient>("patients")
        .find({}, { projection: { _id: 0, passwordHash: 0 } })
        .toArray();

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
        .slice(0, topWardsN);

      const topDiagnoses = Array.from(diagCount.entries())
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topDiagN);

      const appointments = await db
        .collection<Appointment>("appointments")
        .find({}, { projection: { _id: 0 } })
        .toArray();

      const apptByStatus: Record<string, number> = {};
      const apptByDoctor = new Map<string, number>();
      for (const a of appointments) {
        apptByStatus[a.status] = (apptByStatus[a.status] ?? 0) + 1;
        apptByDoctor.set(a.doctorId, (apptByDoctor.get(a.doctorId) ?? 0) + 1);
      }

      const doctorIds = Array.from(apptByDoctor.keys());
      const doctors = doctorIds.length
        ? await db
            .collection<Doctor>("doctors")
            .find(
              { id: { $in: doctorIds } },
              { projection: { id: 1, fullName: 1, _id: 0 } }
            )
            .toArray()
        : [];
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
    }
  );
}
