import type { LabResult, Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";
import {
  asGender,
  asNumber,
  asString,
  asStringArray,
  buildVitalsPartial,
  PATIENT_ID_RE,
} from "../shared.ts";
import { handleGetPatientRecord } from "../get_patient_record/handlers.ts";

type UpdatePatientInput = {
  id?: unknown;
  name?: unknown;
  age?: unknown;
  gender?: unknown;
  ward?: unknown;
  vitals?: unknown;
  add_diagnoses?: unknown;
  remove_diagnoses?: unknown;
  add_medications?: unknown;
  remove_medications?: unknown;
  add_lab_results?: unknown;
};

function normalizeLabResult(raw: unknown): LabResult | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Lab entry không phải object" };
  }
  const e = raw as Record<string, unknown>;
  const name = asString(e.name);
  const unit = asString(e.unit);
  const referenceRange = asString(e.referenceRange);
  const value =
    typeof e.value === "number" || typeof e.value === "string"
      ? (e.value as number | string)
      : undefined;
  const isAbnormal =
    typeof e.isAbnormal === "boolean" ? e.isAbnormal : undefined;
  if (
    !name ||
    !unit ||
    !referenceRange ||
    value === undefined ||
    isAbnormal === undefined
  ) {
    return {
      error:
        "Lab entry thiếu trường bắt buộc (name, value, unit, referenceRange, isAbnormal).",
    };
  }
  let recordedAt: Date;
  if (e.recordedAt instanceof Date) {
    recordedAt = e.recordedAt;
  } else if (typeof e.recordedAt === "string") {
    const d = new Date(e.recordedAt);
    recordedAt = Number.isNaN(d.getTime()) ? new Date() : d;
  } else {
    recordedAt = new Date();
  }
  return { name, value, unit, referenceRange, isAbnormal, recordedAt };
}

export async function handleUpdatePatient(
  input: UpdatePatientInput
): Promise<string> {
  const id = asString(input.id)?.trim();
  if (!id || !PATIENT_ID_RE.test(id)) {
    return JSON.stringify({ error: `id không hợp lệ: ${input.id}` });
  }

  const $set: Record<string, unknown> = {};
  const $addToSet: Record<string, unknown> = {};
  const $pull: Record<string, unknown> = {};
  const $push: Record<string, unknown> = {};
  const applied: string[] = [];

  const name = asString(input.name);
  if (name !== undefined) {
    $set.name = name;
    applied.push("name");
  }
  const age = asNumber(input.age);
  if (age !== undefined) {
    $set.age = age;
    applied.push("age");
  }
  const gender = asGender(input.gender);
  if (gender !== undefined) {
    $set.gender = gender;
    applied.push("gender");
  }
  const ward = asString(input.ward);
  if (ward !== undefined) {
    $set.ward = ward;
    applied.push("ward");
  }

  const vitalsPartial = buildVitalsPartial(input.vitals);
  if (vitalsPartial) {
    for (const [k, v] of Object.entries(vitalsPartial)) {
      $set[`vitals.${k}`] = v;
      applied.push(`vitals.${k}`);
    }
    $set["vitals.recordedAt"] = new Date();
    applied.push("vitals.recordedAt");
  }

  const addDiag = asStringArray(input.add_diagnoses);
  if (addDiag && addDiag.length > 0) {
    $addToSet.diagnoses = { $each: addDiag };
    applied.push("add_diagnoses");
  }
  const removeDiag = asStringArray(input.remove_diagnoses);
  if (removeDiag && removeDiag.length > 0) {
    $pull.diagnoses = { $in: removeDiag };
    applied.push("remove_diagnoses");
  }
  const addMed = asStringArray(input.add_medications);
  if (addMed && addMed.length > 0) {
    $addToSet.medications = { $each: addMed };
    applied.push("add_medications");
  }
  const removeMed = asStringArray(input.remove_medications);
  if (removeMed && removeMed.length > 0) {
    $pull.medications = { $in: removeMed };
    applied.push("remove_medications");
  }

  if (
    Array.isArray(input.add_lab_results) &&
    input.add_lab_results.length > 0
  ) {
    const labs: LabResult[] = [];
    for (const raw of input.add_lab_results) {
      const out = normalizeLabResult(raw);
      if ("error" in out) {
        return JSON.stringify({ error: out.error });
      }
      labs.push(out);
    }
    $push.labResults = { $each: labs };
    applied.push("add_lab_results");
  }

  if (applied.length === 0) {
    return JSON.stringify({
      error: "Cần ít nhất một trường để cập nhật ngoài id.",
    });
  }

  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($addToSet).length) update.$addToSet = $addToSet;
  if (Object.keys($pull).length) update.$pull = $pull;
  if (Object.keys($push).length) update.$push = $push;

  try {
    const db = await connectDB();
    const res = await db
      .collection<Patient>("patients")
      .updateOne({ id }, update);
    if (res.matchedCount === 0) {
      return JSON.stringify({ error: `Không tìm thấy bệnh nhân ${id}.` });
    }
    return handleGetPatientRecord(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Cập nhật thất bại: ${msg}` });
  }
}
