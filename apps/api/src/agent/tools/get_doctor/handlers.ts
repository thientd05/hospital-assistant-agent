import type { Doctor } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";

export async function handleGetDoctor(doctorId: string): Promise<string> {
  const id = doctorId.trim();
  if (!id) {
    return JSON.stringify({ error: "Thiếu mã bác sĩ." });
  }
  const db = await connectDB();
  const doctor = await db
    .collection<Doctor>("doctors")
    .findOne({ id }, { projection: { _id: 0, passwordHash: 0 } });
  if (!doctor) {
    return JSON.stringify({
      error: `Không tìm thấy bác sĩ với mã ${id}`,
    });
  }
  return JSON.stringify(doctor);
}
