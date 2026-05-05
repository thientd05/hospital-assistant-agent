import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { connectDB } from "../../db/client.ts";
import { hashPassword } from "../../auth/password.ts";
import type {
  Appointment,
  Doctor,
  LabResult,
  Patient,
  Vital,
} from "@pr_hospitalagent/types";

const AGENT_ROOT = resolve(import.meta.dirname, "..");
const SKILLS_DIR = join(AGENT_ROOT, "skills");
const WORKSPACES_DIR = join(AGENT_ROOT, "workspaces");
const DOCTOR_ID_RE = /^[A-Za-z0-9_-]+$/;
const SKILL_NAME_RE = /^[A-Za-z0-9_-]+$/;
const PATIENT_ID_RE = /^BN\d+$/i;
const MEMORY_FILES = new Set(["USER.md", "SOUL.md", "MEMORY.md"]);
const MAX_READ_BYTES = 200_000;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

type InteractionRule = {
  match: (drugs: string[]) => boolean;
  message: string;
};

const has = (drugs: string[], keyword: string) =>
  drugs.some((d) => d.toLowerCase().includes(keyword.toLowerCase()));

const rules: InteractionRule[] = [
  {
    match: (d) => has(d, "warfarin") && has(d, "aspirin"),
    message:
      "Warfarin + Aspirin: tăng nguy cơ chảy máu — cần theo dõi INR và cân nhắc thay thế.",
  },
  {
    match: (d) =>
      has(d, "metformin") && (has(d, "contrast") || has(d, "cản quang")),
    message:
      "Metformin + Thuốc cản quang: nguy cơ nhiễm toan lactic — cần ngưng Metformin 48h trước khi tiêm cản quang.",
  },
  {
    match: (d) =>
      (has(d, "ace") ||
        has(d, "captopril") ||
        has(d, "enalapril") ||
        has(d, "lisinopril") ||
        has(d, "ramipril")) &&
      (has(d, "kali") || has(d, "potassium") || has(d, "k+")),
    message:
      "ACE inhibitor + Kali: nguy cơ tăng kali máu — cần theo dõi điện giải đồ.",
  },
];

export async function handleGetAppointments(doctorId: string): Promise<string> {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  const db = await connectDB();
  const appointments = await db
    .collection<Appointment>("appointments")
    .find({ doctorId })
    .sort({ scheduledAt: 1 })
    .toArray();

  const patientIds = Array.from(new Set(appointments.map((a) => a.patientId)));
  const patients = patientIds.length
    ? await db
        .collection<Patient>("patients")
        .find(
          { id: { $in: patientIds } },
          { projection: { id: 1, name: 1, _id: 0 } }
        )
        .toArray()
    : [];
  const nameById = new Map(patients.map((p) => [p.id, p.name]));

  const rows = appointments.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    patientName: nameById.get(a.patientId) ?? null,
    doctorId: a.doctorId,
    scheduledAt: a.scheduledAt,
    reason: a.reason,
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));

  return JSON.stringify(rows);
}

type CustomerStatsInput = {
  topDiagnoses?: unknown;
  topWards?: unknown;
};

function ageBucket(age: number): "0-17" | "18-39" | "40-59" | "60+" {
  if (age <= 17) return "0-17";
  if (age <= 39) return "18-39";
  if (age <= 59) return "40-59";
  return "60+";
}

export async function handleGetCustomerStats(
  input: CustomerStatsInput
): Promise<string> {
  const topDiagN =
    typeof input.topDiagnoses === "number" && input.topDiagnoses > 0
      ? Math.floor(input.topDiagnoses)
      : 10;
  const topWardsN =
    typeof input.topWards === "number" && input.topWards > 0
      ? Math.floor(input.topWards)
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

  return JSON.stringify({
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
  });
}

export function handleCheckDrugInteraction(drugs: string[]): string {
  const matches = rules.filter((r) => r.match(drugs)).map((r) => r.message);
  if (matches.length === 0) {
    return "Không phát hiện tương tác thuốc đáng kể";
  }
  return matches.join("\n");
}

function writeWorkspaceFile(
  doctorId: string,
  name: string,
  content: string
): string {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  const dir = join(WORKSPACES_DIR, doctorId);
  mkdirSync(dir, { recursive: true });
  const text = content.endsWith("\n") ? content : content + "\n";
  writeFileSync(join(dir, name), text, "utf8");
  return JSON.stringify({
    ok: true,
    file: `workspaces/${doctorId}/${name}`,
    message: `Đã cập nhật ${name}. Nội dung mới sẽ áp dụng từ tin nhắn tiếp theo.`,
  });
}

export function handleUpdateUserProfile(
  doctorId: string,
  content: string
): string {
  return writeWorkspaceFile(doctorId, "USER.md", content);
}

export function handleUpdateWorkingStyle(
  doctorId: string,
  content: string
): string {
  return writeWorkspaceFile(doctorId, "SOUL.md", content);
}

export function handleUpdateMemory(doctorId: string, entry: string): string {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  const trimmed = typeof entry === "string" ? entry.trim() : "";
  if (!trimmed) {
    return JSON.stringify({ error: "Nội dung mục kinh nghiệm rỗng." });
  }
  const dir = join(WORKSPACES_DIR, doctorId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "MEMORY.md");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const base = existing.replace(/\s+$/, "");
  const next = base ? `${base}\n\n${trimmed}\n` : `${trimmed}\n`;
  writeFileSync(path, next, "utf8");
  return JSON.stringify({
    ok: true,
    file: `workspaces/${doctorId}/MEMORY.md`,
    appendedChars: trimmed.length,
    message: "Đã ghi thêm vào MEMORY.md.",
  });
}

type CreatePatientInput = {
  name?: unknown;
  age?: unknown;
  gender?: unknown;
  ward?: unknown;
  diagnoses?: unknown;
  medications?: unknown;
  vitals?: unknown;
};

type UpdatePatientInput = CreatePatientInput & {
  id?: unknown;
  add_diagnoses?: unknown;
  remove_diagnoses?: unknown;
  add_medications?: unknown;
  remove_medications?: unknown;
  add_lab_results?: unknown;
};

const VITAL_DEFAULTS: Vital = {
  spO2: 0,
  heartRate: 0,
  bloodPressure: "",
  temperature: 0,
  recordedAt: new Date(0),
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function asGender(v: unknown): "Nam" | "Nữ" | undefined {
  return v === "Nam" || v === "Nữ" ? v : undefined;
}
function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((x): x is string => typeof x === "string");
  return arr.length === v.length ? arr : undefined;
}

function buildVitalsPartial(
  raw: unknown
): Partial<Vital> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const out: Partial<Vital> = {};
  if (asNumber(v.spO2) !== undefined) out.spO2 = v.spO2 as number;
  if (asNumber(v.heartRate) !== undefined) out.heartRate = v.heartRate as number;
  if (asString(v.bloodPressure) !== undefined)
    out.bloodPressure = v.bloodPressure as string;
  if (asNumber(v.temperature) !== undefined)
    out.temperature = v.temperature as number;
  return Object.keys(out).length > 0 ? out : undefined;
}

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
  const isAbnormal = typeof e.isAbnormal === "boolean" ? e.isAbnormal : undefined;
  if (!name || !unit || !referenceRange || value === undefined || isAbnormal === undefined) {
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
  const vitals: Vital =
    vitalsInput
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

  if (Array.isArray(input.add_lab_results) && input.add_lab_results.length > 0) {
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

export function handleListSkills(): string {
  if (!existsSync(SKILLS_DIR)) {
    return JSON.stringify({ skills: [] });
  }
  const skills: { name: string; description: string }[] = [];
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(SKILLS_DIR, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const content = readFileSync(skillPath, "utf8");
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let description = "(không có mô tả)";
    if (m) {
      for (const line of m[1]!.split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx > 0 && line.slice(0, idx).trim() === "description") {
          description = line.slice(idx + 1).trim();
          break;
        }
      }
    }
    skills.push({ name: entry.name, description });
  }
  return JSON.stringify({ skills });
}

export function handleWriteSkill(name: string, content: string): string {
  if (!name || typeof name !== "string" || !SKILL_NAME_RE.test(name)) {
    return JSON.stringify({ error: `Tên skill không hợp lệ: ${name}` });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return JSON.stringify({ error: "Nội dung skill không được để trống." });
  }
  const dir = join(SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  const text = content.endsWith("\n") ? content : content + "\n";
  writeFileSync(join(dir, "SKILL.md"), text, "utf8");
  return JSON.stringify({
    ok: true,
    skill: name,
    path: `skills/${name}/SKILL.md`,
    message: `Đã lưu skill "${name}". Skill sẽ khả dụng trong thư viện từ cuộc trò chuyện tiếp theo.`,
  });
}

export function handleReadSkill(name: string): string {
  if (!name || typeof name !== "string" || !SKILL_NAME_RE.test(name)) {
    return JSON.stringify({ error: `Tên kỹ năng không hợp lệ: ${name}` });
  }
  const path = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(path)) {
    return JSON.stringify({ error: `Không tìm thấy kỹ năng: ${name}` });
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    return JSON.stringify({ error: `Đường dẫn không phải file: ${path}` });
  }
  if (stat.size > MAX_READ_BYTES) {
    return JSON.stringify({
      error: `File quá lớn: ${stat.size} bytes (giới hạn ${MAX_READ_BYTES}).`,
    });
  }
  const content = readFileSync(path, "utf8");
  return JSON.stringify({
    skill: name,
    path: `skills/${name}/SKILL.md`,
    content,
  });
}

export function handleReadMemory(doctorId: string, file: string): string {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  if (!file || !MEMORY_FILES.has(file)) {
    return JSON.stringify({
      error:
        "Chỉ được đọc USER.md, SOUL.md hoặc MEMORY.md qua tool này. AGENT.md bị cấm đọc.",
    });
  }
  const path = join(WORKSPACES_DIR, doctorId, file);
  if (!existsSync(path)) {
    return JSON.stringify({
      error: `File ${file} chưa tồn tại trong workspace.`,
    });
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    return JSON.stringify({ error: `Đường dẫn không phải file: ${path}` });
  }
  if (stat.size > MAX_READ_BYTES) {
    return JSON.stringify({
      error: `File quá lớn: ${stat.size} bytes (giới hạn ${MAX_READ_BYTES}).`,
    });
  }
  const content = readFileSync(path, "utf8");
  return JSON.stringify({
    file,
    path: `workspaces/${doctorId}/${file}`,
    content,
  });
}
