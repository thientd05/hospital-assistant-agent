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

// === Danh mục xét nghiệm — NGUỒN SỰ THẬT cho đơn vị, khoảng tham chiếu, cách xác
// định bất thường (dùng chung FE + API). Bác sĩ chỉ chọn TÊN + nhập KẾT QUẢ; phần
// còn lại (unit/referenceRange/isAbnormal) máy tự suy từ đây. ===
//
// Hai loại:
//  - Định lượng (numeric): có `low`/`high` (một hoặc cả hai). isAbnormal khi giá trị
//    nằm ngoài [low, high]. `referenceRange` là chuỗi hiển thị tương ứng.
//  - Định tính (qualitative): có `normal` (giá trị bình thường, vd "Âm tính").
//    isAbnormal khi kết quả nhập KHÁC `normal` (so sánh không phân biệt hoa/thường).
export type LabCatalogEntry = {
  name: string;
  unit: string;
  referenceRange: string;
  low?: number;
  high?: number;
  /** Giá trị bình thường cho xét nghiệm định tính (vd "Âm tính", "Bình thường"). */
  normal?: string;
};

export const LAB_CATALOG: LabCatalogEntry[] = [
  // --- Chuyển hoá / Đái tháo đường ---
  { name: "Glucose", unit: "mmol/L", referenceRange: "3.9-6.1", low: 3.9, high: 6.1 },
  { name: "HbA1c", unit: "%", referenceRange: "<6.5", high: 6.5 },
  // --- Mỡ máu ---
  { name: "Cholesterol toàn phần", unit: "mmol/L", referenceRange: "<5.2", high: 5.2 },
  { name: "LDL-C", unit: "mmol/L", referenceRange: "<3.4", high: 3.4 },
  { name: "HDL-C", unit: "mmol/L", referenceRange: ">1.0", low: 1.0 },
  { name: "Triglyceride", unit: "mmol/L", referenceRange: "<1.7", high: 1.7 },
  // --- Chức năng thận / điện giải ---
  { name: "Creatinine", unit: "mg/dL", referenceRange: "0.7-1.2", low: 0.7, high: 1.2 },
  { name: "Ure máu", unit: "mmol/L", referenceRange: "2.5-7.5", low: 2.5, high: 7.5 },
  { name: "Acid uric", unit: "mg/dL", referenceRange: "2.4-6.0", low: 2.4, high: 6.0 },
  { name: "eGFR", unit: "mL/phút/1.73m²", referenceRange: ">90", low: 90 },
  { name: "Kali", unit: "mmol/L", referenceRange: "3.5-5.0", low: 3.5, high: 5.0 },
  { name: "Natri", unit: "mmol/L", referenceRange: "135-145", low: 135, high: 145 },
  // --- Chức năng gan ---
  { name: "AST", unit: "U/L", referenceRange: "<40", high: 40 },
  { name: "ALT", unit: "U/L", referenceRange: "<40", high: 40 },
  { name: "Bilirubin toàn phần", unit: "mg/dL", referenceRange: "0.3-1.2", low: 0.3, high: 1.2 },
  // --- Huyết học ---
  { name: "Hb", unit: "g/dL", referenceRange: "13-17", low: 13, high: 17 },
  { name: "Hematocrit", unit: "%", referenceRange: "35-45", low: 35, high: 45 },
  { name: "Bạch cầu", unit: "K/uL", referenceRange: "4-10", low: 4, high: 10 },
  { name: "Tiểu cầu", unit: "K/uL", referenceRange: "150-400", low: 150, high: 400 },
  { name: "INR", unit: "", referenceRange: "0.8-1.2", low: 0.8, high: 1.2 },
  // --- Viêm / nhiễm trùng ---
  { name: "CRP", unit: "mg/L", referenceRange: "<5", high: 5 },
  { name: "Procalcitonin", unit: "ng/mL", referenceRange: "<0.5", high: 0.5 },
  { name: "Lactate", unit: "mmol/L", referenceRange: "<2", high: 2 },
  // --- Tim mạch ---
  { name: "NT-proBNP", unit: "pg/mL", referenceRange: "<125", high: 125 },
  { name: "Troponin I", unit: "ng/mL", referenceRange: "<0.04", high: 0.04 },
  { name: "CK-MB", unit: "U/L", referenceRange: "<16", high: 16 },
  // --- Tuỵ ---
  { name: "Amylase", unit: "U/L", referenceRange: "30-110", low: 30, high: 110 },
  { name: "Lipase", unit: "U/L", referenceRange: "<60", high: 60 },
  // --- Khí máu ---
  { name: "PaCO2", unit: "mmHg", referenceRange: "35-45", low: 35, high: 45 },
  { name: "PaO2", unit: "mmHg", referenceRange: "80-100", low: 80, high: 100 },
  { name: "pH máu", unit: "", referenceRange: "7.35-7.45", low: 7.35, high: 7.45 },
  // --- Tuyến giáp ---
  { name: "TSH", unit: "mIU/L", referenceRange: "0.4-4.0", low: 0.4, high: 4.0 },
  // --- Định tính (kết quả là chữ) ---
  { name: "NS1 Dengue", unit: "", referenceRange: "Âm tính", normal: "Âm tính" },
  { name: "HBsAg", unit: "", referenceRange: "Âm tính", normal: "Âm tính" },
  { name: "Test nhanh COVID-19", unit: "", referenceRange: "Âm tính", normal: "Âm tính" },
];

export function findLabEntry(name: string): LabCatalogEntry | undefined {
  const key = name.trim().toLowerCase();
  return LAB_CATALOG.find((e) => e.name.toLowerCase() === key);
}

// Suy ra một LabResult đầy đủ từ TÊN xét nghiệm + KẾT QUẢ thô bác sĩ nhập.
// Đây là logic AUTHORITATIVE — server gọi để chuẩn hoá trước khi lưu.
// Tên không có trong danh mục: giữ nguyên giá trị (số nếu parse được), đơn vị/khoảng
// tham chiếu rỗng, không đánh dấu bất thường (an toàn — FE chỉ cho chọn trong danh mục).
export function computeLab(
  name: string,
  rawValue: string | number,
  recordedAt: Date = new Date()
): LabResult {
  const entry = findLabEntry(name);
  const trimmedName = name.trim();

  if (!entry) {
    const n = Number(rawValue);
    const value =
      typeof rawValue === "number"
        ? rawValue
        : Number.isFinite(n) && String(rawValue).trim() !== ""
          ? n
          : String(rawValue).trim();
    return { name: trimmedName, value, unit: "", referenceRange: "", isAbnormal: false, recordedAt };
  }

  // Định tính: kết quả là chữ, bất thường khi khác giá trị bình thường.
  if (entry.normal !== undefined) {
    const value = String(rawValue).trim();
    const isAbnormal = value.toLowerCase() !== entry.normal.toLowerCase();
    return {
      name: entry.name,
      value,
      unit: entry.unit,
      referenceRange: entry.referenceRange,
      isAbnormal,
      recordedAt,
    };
  }

  // Định lượng: so giá trị số với [low, high].
  const v = Number(rawValue);
  const isAbnormal =
    Number.isFinite(v) &&
    ((entry.low !== undefined && v < entry.low) ||
      (entry.high !== undefined && v > entry.high));
  return {
    name: entry.name,
    value: Number.isFinite(v) ? v : String(rawValue).trim(),
    unit: entry.unit,
    referenceRange: entry.referenceRange,
    isAbnormal: Boolean(isAbnormal),
    recordedAt,
  };
}

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

// ───────────────────────────────────────────────── Danh mục thuốc (TH00X)
// Catalog thuốc dùng chung cho bác sĩ kê đơn (tab Hồ sơ → form chọn thuốc).
export type MedicationCategory =
  | "Kháng sinh"
  | "Tim mạch – Huyết áp"
  | "Lợi tiểu – Thận"
  | "Tiểu đường"
  | "Giảm đau – Hạ sốt"
  | "Hô hấp"
  | "Tiêu hóa"
  | "Dịch truyền – Khác";

export type Medication = {
  id: string;
  name: string;
  category: MedicationCategory;
  createdAt: Date;
};

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

