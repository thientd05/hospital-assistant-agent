export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  // Thứ tự xen kẽ thật giữa các đoạn text và tool trong một lượt assistant.
  // Khi có, UI render theo đúng thứ tự này (text/tool nối tiếp như agent phát ra);
  // content/toolCalls vẫn giữ làm fallback + dữ liệu cũ.
  parts?: MessagePart[];
  createdAt: Date;
};

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool"; toolCall: ToolCall };

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

// Chỉ số bệnh nhân tự nhập tại nhà — lịch sử riêng, tách `vitals` lâm sàng do bác sĩ ghi.
// Mỗi field chỉ số là optional (BN nhập field nào ghi field đó), recordedAt do server set.
export type HomeVital = {
  spO2?: number;
  heartRate?: number;
  bloodPressure?: string;
  temperature?: number;
  note?: string;
  recordedAt: Date;
};

export type Patient = {
  id: string;
  // Bệnh nhân tự đăng ký KHÔNG có username — đăng nhập bằng `phone`. Username chỉ
  // còn cho BN do bác sĩ tạo (username = id) để vẫn đăng nhập được → optional.
  username?: string;
  passwordHash: string;
  name: string;
  age: number;
  gender: "Nam" | "Nữ";
  ward: string;
  address: string;
  phone: string;
  diagnoses: string[];
  vitals: Vital;
  medications: string[];
  labResults: LabResult[];
  homeVitals: HomeVital[];
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
  // DS bệnh nhân bác sĩ này quản lý (quan hệ nhiều–nhiều). Hình thành khi bác sĩ duyệt lịch hẹn.
  patientIds: string[];
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

// ───────────────────────────── Tin nhắn trực tiếp 1-1 bác sĩ ↔ bệnh nhân ───
// Mỗi cặp (doctorId, patientId) = đúng MỘT thread. `sender` cho biết ai gửi.
export type DirectSender = "doctor" | "patient";

export type DirectMessage = {
  sender: DirectSender;
  content: string;
  createdAt: Date;
};

export type DirectThread = {
  id: string;
  doctorId: string;
  patientId: string;
  messages: DirectMessage[];
  createdAt: Date;
  updatedAt: Date;
};

// Một dòng trong sidebar (theo góc nhìn 1 phía): đối phương + tin cuối.
export type DirectThreadSummary = {
  // id đối phương: patientId (góc nhìn bác sĩ) | doctorId (góc nhìn bệnh nhân).
  counterpartId: string;
  counterpartName: string;
  lastMessage: string | null;
  updatedAt: Date | null;
};

export type AppointmentStatus = "Chờ duyệt" | "Đã duyệt";

export type Appointment = {
  id: string;
  patientId: string;
  // `""` = chưa có bác sĩ nhận (lịch ở hàng chờ chung); bác sĩ nào duyệt trước thì nhận.
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

// Bác sĩ chỉ sửa phần lâm sàng (khớp PatientUpdateSchema backend). Thông tin cá
// nhân do bệnh nhân tự sửa qua /auth/me/profile; mã BN không ai sửa. Không còn
// PatientCreateInput — bệnh nhân tự đăng ký, bác sĩ KHÔNG tạo/xoá bệnh nhân.
export type PatientUpdateInput = {
  ward?: string;
  diagnoses?: string[];
  medications?: string[];
  vitals?: Partial<Vital>;
};

// Bệnh nhân tự nhập 1 bản ghi chỉ số tại nhà (recordedAt do server gán).
export type HomeVitalInput = Omit<HomeVital, "recordedAt">;

// Bệnh nhân tự đặt lịch: không truyền patientId (lấy từ JWT); doctorId tuỳ chọn
// (rỗng/không truyền = vào hàng chờ chung).
export type PatientAppointmentCreateInput = {
  scheduledAt: string | Date;
  reason: string;
  doctorId?: string;
};

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

export type Workspace = {
  id: string;
  memory: string;
  soul: string;
  user: string;
  updatedAt: string | Date;
};

export type WorkspaceKey = "memory" | "soul" | "user";

// Boot prompt (AGENT.md) của agent theo vai trò — lưu Mongo, đọc qua REST.
export type BootRole = "doctor" | "patient";

export type Boot = {
  role: BootRole;
  content: string;
  updatedAt: string | Date;
};

// Skill (SKILL.md) cho agent — lưu Mongo, key = name slug. description suy từ frontmatter.
export type Skill = {
  name: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type SkillSummary = { name: string; description: string };

// Shape chi tiết trả cho FE (giữ tương thích hợp đồng cũ của agent skills route).
export type SkillDetail = { skill: string; path: string; content: string };

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

