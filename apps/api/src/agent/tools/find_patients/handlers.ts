import type { Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";
import { escapeRegex } from "../shared.ts";

type FindPatientsInput = {
  name?: unknown;
  age?: unknown;
  gender?: unknown;
  ward?: unknown;
  diagnosis?: unknown;
};

const FIND_PATIENTS_LIMIT = 50;

export async function handleFindPatients(
  input: FindPatientsInput
): Promise<string> {
  const filter: Record<string, unknown> = {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const ward = typeof input.ward === "string" ? input.ward.trim() : "";
  const diagnosis =
    typeof input.diagnosis === "string" ? input.diagnosis.trim() : "";
  const age = typeof input.age === "number" ? input.age : null;
  const gender =
    input.gender === "Nam" || input.gender === "Nữ" ? input.gender : null;

  if (name) filter.name = { $regex: escapeRegex(name), $options: "i" };
  if (ward) filter.ward = { $regex: escapeRegex(ward), $options: "i" };
  if (diagnosis)
    filter.diagnoses = {
      $elemMatch: { $regex: escapeRegex(diagnosis), $options: "i" },
    };
  if (age !== null) filter.age = age;
  if (gender !== null) filter.gender = gender;

  if (Object.keys(filter).length === 0) {
    return JSON.stringify({
      error:
        "Cần ít nhất một tiêu chí tìm kiếm (name, age, gender, ward, hoặc diagnosis).",
    });
  }

  const db = await connectDB();
  const docs = await db
    .collection<Patient>("patients")
    .find(filter, { projection: { id: 1, _id: 0 } })
    .limit(FIND_PATIENTS_LIMIT + 1)
    .toArray();

  const truncated = docs.length > FIND_PATIENTS_LIMIT;
  const patientIds = docs.slice(0, FIND_PATIENTS_LIMIT).map((d) => d.id);

  return JSON.stringify({
    count: patientIds.length,
    patientIds,
    ...(truncated ? { truncated: true } : {}),
  });
}
