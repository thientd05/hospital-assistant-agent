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
