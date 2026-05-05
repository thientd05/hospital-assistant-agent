import type { Patient, Vital } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";
import { hashPassword } from "../../../auth/password.ts";
import {
  asGender,
  asNumber,
  asString,
  asStringArray,
  buildVitalsPartial,
  VITAL_DEFAULTS,
} from "../shared.ts";
import { handleGetPatientRecord } from "../get_patient_record/handlers.ts";

type CreatePatientInput = {
  name?: unknown;
  age?: unknown;
  gender?: unknown;
  ward?: unknown;
  diagnoses?: unknown;
  medications?: unknown;
  vitals?: unknown;
};

async function nextPatientId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("patients")
    .find({ id: { $regex: "^BN\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^BN(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  const next = maxNum + 1;
  return "BN" + String(next).padStart(Math.max(3, maxLen), "0");
}

export async function handleCreatePatient(
  input: CreatePatientInput
): Promise<string> {
  const id = await nextPatientId();
  const vitalsInput = buildVitalsPartial(input.vitals);
  const vitals: Vital = vitalsInput
    ? { ...VITAL_DEFAULTS, ...vitalsInput, recordedAt: new Date() }
    : { ...VITAL_DEFAULTS, recordedAt: new Date() };

  const username = id.toLowerCase();
  const password = `matkhau${username}`;

  const patient: Patient = {
    id,
    username,
    passwordHash: hashPassword(password),
    name: asString(input.name) ?? "",
    age: asNumber(input.age) ?? 0,
    gender: (asGender(input.gender) ?? "") as Patient["gender"],
    ward: asString(input.ward) ?? "",
    diagnoses: asStringArray(input.diagnoses) ?? [],
    medications: asStringArray(input.medications) ?? [],
    vitals,
    labResults: [],
  };

  try {
    const db = await connectDB();
    await db.collection<Patient>("patients").insertOne(patient);
    return handleGetPatientRecord(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Tạo bệnh nhân thất bại: ${msg}` });
  }
}
