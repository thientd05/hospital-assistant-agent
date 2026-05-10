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

export type AssetCategory =
  | "Thiết bị y tế"
  | "Nội thất"
  | "Máy tính"
  | "Khác";

export type AssetCondition = "Tốt" | "Bình thường" | "Cần sửa" | "Hỏng";

export type Asset = {
  id: string;
  name: string;
  category: AssetCategory;
  location: string;
  purchaseDate: Date;
  purchasePrice: number;
  depreciationYears: number;
  condition: AssetCondition;
  notes?: string;
  createdAt: Date;
};

export type AssetCreateInput = {
  name: string;
  category: AssetCategory;
  location: string;
  purchaseDate: string | Date;
  purchasePrice: number;
  depreciationYears: number;
  condition: AssetCondition;
  notes?: string;
};

export type AssetUpdateInput = Partial<AssetCreateInput>;

export type UtilityType = "Điện" | "Nước" | "Internet" | "Gas";
export type UtilityStatus = "Chưa thanh toán" | "Đã thanh toán";

export type Utility = {
  id: string;
  type: UtilityType;
  period: string;
  amount: number;
  usage: number;
  unit: string;
  paidDate: Date | null;
  status: UtilityStatus;
  notes?: string;
  createdAt: Date;
};

export type UtilityCreateInput = {
  type: UtilityType;
  period: string;
  amount: number;
  usage: number;
  unit: string;
  paidDate?: string | Date | null;
  status: UtilityStatus;
  notes?: string;
};

export type UtilityUpdateInput = Partial<UtilityCreateInput>;

export type PayrollStatus = "Chưa thanh toán" | "Đã thanh toán";
export type EmployeeRole = "doctor" | "expert" | "manager";

export type Payroll = {
  id: string;
  employeeId: string;
  employeeRole: EmployeeRole;
  employeeName: string;
  period: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  net: number;
  paidDate: Date | null;
  status: PayrollStatus;
  notes?: string;
  createdAt: Date;
};

export type PayrollCreateInput = {
  employeeId: string;
  employeeRole: EmployeeRole;
  employeeName: string;
  period: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  paidDate?: string | Date | null;
  status: PayrollStatus;
  notes?: string;
};

export type PayrollUpdateInput = Partial<PayrollCreateInput>;

export type RevenueSource =
  | "Khám bệnh"
  | "Xét nghiệm"
  | "Bán thuốc"
  | "Dịch vụ khác";

export type Revenue = {
  id: string;
  source: RevenueSource;
  period: string;
  amount: number;
  date: Date;
  patientId?: string;
  notes?: string;
  createdAt: Date;
};

export type RevenueCreateInput = {
  source: RevenueSource;
  period: string;
  amount: number;
  date: string | Date;
  patientId?: string;
  notes?: string;
};

export type RevenueUpdateInput = Partial<RevenueCreateInput>;

export type FinancialMonthPoint = {
  period: string;
  revenue: number;
  expensesPayroll: number;
  expensesUtilities: number;
  profit: number;
};

export type FinancialStatsData = {
  currentMonth: FinancialMonthPoint;
  monthlyTrend: FinancialMonthPoint[];
  revenueBySource: { source: string; amount: number }[];
  expensesByCategory: { category: string; amount: number }[];
  utilitiesByType: { type: string; amount: number }[];
  assets: {
    total: number;
    totalValue: number;
    byCategory: { category: string; count: number; value: number }[];
    byCondition: { condition: string; count: number }[];
  };
  payroll: {
    currentMonthTotal: number;
    unpaidCount: number;
  };
};

