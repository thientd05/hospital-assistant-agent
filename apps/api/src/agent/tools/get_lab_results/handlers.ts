import type { Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";

export async function handleGetLabResults(
  patientId: string,
  limit = 10
): Promise<string> {
  const db = await connectDB();
  const patient = await db
    .collection<Patient>("patients")
    .findOne({ id: patientId }, { projection: { _id: 0, passwordHash: 0 } });
  if (!patient) {
    return JSON.stringify({
      error: `Không tìm thấy bệnh nhân với mã ${patientId}`,
    });
  }
  const labs = (patient.labResults ?? []).slice(0, limit);
  return JSON.stringify({ patientId, labResults: labs });
}
