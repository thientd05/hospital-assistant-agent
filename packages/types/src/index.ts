export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  createdAt: Date;
};

export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
};

export type Vital = {
  spO2: number;
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  recordedAt: Date;
};

export type LabResult = {
  name: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  recordedAt: Date;
};

export type Patient = {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  age: number;
  gender: "Nam" | "Nữ";
  ward: string;
  diagnoses: string[];
  vitals: Vital;
  medications: string[];
  labResults: LabResult[];
};

export type PatientPublic = Omit<Patient, "passwordHash">;

export type ModelKey = "haiku" | "sonnet";

export type Doctor = {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  title: string;
  department: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
  workspaceDir: string;
  createdAt: Date;
};

export type DoctorPublic = Omit<Doctor, "passwordHash">;

export type Manager = {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  title: string;
  clinicName: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
};

export type ManagerPublic = Omit<Manager, "passwordHash">;

export type Expert = {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  title: string;
  expertise: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
};

export type ExpertPublic = Omit<Expert, "passwordHash">;

export type Conversation = {
  id: string;
  title: string;
  doctorId?: string;
  patientId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentStatus = "Chờ duyệt" | "Đã duyệt" | "Thành công";

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  reason: string;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ToolRefresh =
  | "patients"
  | "patient"
  | "lab"
  | "appointments"
  | "stats"
  | "doctors"
  | "doctor"
  | "experts"
  | "expert"
  | "skills"
  | "skill"
  | false;

export type PatientCreateInput = {
  id?: string;
  name: string;
  age: number;
  gender: "Nam" | "Nữ";
  ward: string;
  diagnoses?: string[];
  medications?: string[];
  vitals?: Partial<Vital>;
  labResults?: LabResult[];
};

export type PatientUpdateInput = Partial<
  Omit<Patient, "id" | "username" | "passwordHash" | "vitals">
> & { vitals?: Partial<Vital> };

export type DoctorCreateInput = {
  fullName: string;
  title: string;
  department: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
  username?: string;
  password?: string;
};

export type DoctorUpdateInput = Partial<
  Omit<Doctor, "id" | "username" | "passwordHash" | "workspaceDir" | "createdAt">
>;

export type ExpertCreateInput = {
  fullName: string;
  title: string;
  expertise: string;
  phone: string;
  email: string;
  address: string;
  username?: string;
  password?: string;
};

export type ExpertUpdateInput = Partial<
  Omit<Expert, "id" | "username" | "passwordHash" | "createdAt">
>;

export type AppointmentCreateInput = {
  patientId: string;
  doctorId?: string;
  scheduledAt: string | Date;
  reason: string;
  status?: AppointmentStatus;
};

export type AppointmentUpdateInput = Partial<
  Omit<Appointment, "id" | "createdAt" | "updatedAt">
>;

export type LabCreateInput = LabResult;

export type SkillCreateInput = {
  name: string;
  content: string;
};

export type SkillUpdateInput = {
  content: string;
};

export type DrugCheckInput = {
  drugs: string[];
};

export type DrugCheckResult = {
  interactions: string[];
} | { message: string };

