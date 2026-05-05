import type { Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";

export async function handleGetPatientRecord(
  patientId: string
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
  return JSON.stringify(patient);
}
