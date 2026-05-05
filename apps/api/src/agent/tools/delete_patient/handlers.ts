import type { Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";
import { asString, PATIENT_ID_RE } from "../shared.ts";
import { handleListPatients } from "../list_patients/handlers.ts";

type DeletePatientInput = {
  id?: unknown;
};

export async function handleDeletePatient(
  input: DeletePatientInput
): Promise<string> {
  const id = asString(input.id)?.trim();
  if (!id || !PATIENT_ID_RE.test(id)) {
    return JSON.stringify({ error: `id không hợp lệ: ${input.id}` });
  }

  try {
    const db = await connectDB();
    const res = await db
      .collection<Patient>("patients")
      .deleteOne({ id });
    if (res.deletedCount === 0) {
      return JSON.stringify({ error: `Không tìm thấy bệnh nhân ${id}.` });
    }
    return handleListPatients();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Xoá bệnh nhân thất bại: ${msg}` });
  }
}
