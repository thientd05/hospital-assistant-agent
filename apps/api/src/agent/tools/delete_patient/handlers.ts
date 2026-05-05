import type { Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";
import { PATIENT_ID_RE } from "../shared.ts";
import { handleListPatients } from "../list_patients/handlers.ts";

type DeletePatientInput = {
  ids?: unknown;
};

export async function handleDeletePatient(
  input: DeletePatientInput
): Promise<string> {
  if (!Array.isArray(input.ids) || input.ids.length === 0) {
    return JSON.stringify({
      error: "`ids` phải là mảng mã bệnh nhân không rỗng.",
    });
  }

  const ids: string[] = [];
  const invalid: unknown[] = [];
  const seen = new Set<string>();
  for (const raw of input.ids) {
    if (typeof raw !== "string") {
      invalid.push(raw);
      continue;
    }
    const id = raw.trim();
    if (!PATIENT_ID_RE.test(id)) {
      invalid.push(raw);
      continue;
    }
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  if (invalid.length > 0) {
    return JSON.stringify({
      error: `Có ${invalid.length} id sai format (cần khớp BN\\d+): ${JSON.stringify(invalid)}`,
    });
  }

  try {
    const db = await connectDB();
    const existing = await db
      .collection<Patient>("patients")
      .find({ id: { $in: ids } }, { projection: { _id: 0, id: 1 } })
      .toArray();
    const existingIds = new Set(existing.map((d) => d.id));
    const deletedIds = ids.filter((id) => existingIds.has(id));
    const notFoundIds = ids.filter((id) => !existingIds.has(id));

    if (deletedIds.length === 0) {
      return JSON.stringify({
        error: `Không tìm thấy bệnh nhân nào trong danh sách: ${JSON.stringify(ids)}.`,
      });
    }

    await db
      .collection<Patient>("patients")
      .deleteMany({ id: { $in: deletedIds } });

    const listJson = await handleListPatients();
    const list = JSON.parse(listJson) as {
      count: number;
      patients: unknown[];
    };

    return JSON.stringify({
      ok: true,
      deletedIds,
      notFoundIds,
      count: list.count,
      patients: list.patients,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Xoá bệnh nhân thất bại: ${msg}` });
  }
}
