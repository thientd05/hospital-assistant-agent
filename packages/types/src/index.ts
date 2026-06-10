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

// NGUỒN SỰ THẬT của danh mục giờ ở Mongo (collection `labcatalogs`, sở hữu bởi
// apps/api). FE nạp qua GET /api/lab-catalog; backend tra entry trước khi computeLab.
// Hàm dưới là helper THUẦN — caller truyền danh mục đã nạp vào.
export function findLabEntry(
  catalog: LabCatalogEntry[],
  name: string
): LabCatalogEntry | undefined {
  const key = name.trim().toLowerCase();
  return catalog.find((e) => e.name.toLowerCase() === key);
}

// Suy ra một LabResult đầy đủ từ TÊN xét nghiệm + KẾT QUẢ thô bác sĩ nhập.
// Đây là logic AUTHORITATIVE — server gọi để chuẩn hoá trước khi lưu.
// Tên không có trong danh mục: giữ nguyên giá trị (số nếu parse được), đơn vị/khoảng
// tham chiếu rỗng, không đánh dấu bất thường (an toàn — FE chỉ cho chọn trong danh mục).
export function computeLab(
  name: string,
  rawValue: string | number,
  entry: LabCatalogEntry | undefined,
  recordedAt: Date = new Date()
): LabResult {
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

// Một dòng thuốc kê: tên thuốc (chọn từ danh mục) + chỉ định dùng do bác sĩ tự
// nhập (vd "Sáng 1 viên sau ăn, tối 1 viên trước ăn 1 tiếng"). `instruction` có
// thể rỗng (bác sĩ chưa ghi cách dùng).
export type Prescription = {
  name: string;
  instruction: string;
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
  medications: Prescription[];
  labResults: LabResult[];
};

export type PatientPublic = Omit<Patient, "passwordHash">;

// Một bản ghi lịch sử khám = snapshot trạng thái lâm sàng của bệnh nhân tại MỘT
// lần khám (gộp theo ngày: cùng patientId + day → cập nhật, khác ngày → tạo mới).
// Sinh TỰ ĐỘNG khi bác sĩ lưu sửa lâm sàng (vitals/diagnoses/medications/labs).
export type ExamRecord = {
  id: string; // "KB00X"
  patientId: string;
  doctorId: string;
  doctorName: string; // denormalize để hiển thị/dashboard (doctor.fullName)
  examDate: Date;
  day: string; // "YYYY-MM-DD" — khoá gộp theo ngày
  ward: string;
  diagnoses: string[];
  medications: Prescription[];
  vitals: Vital;
  labResults: LabResult[];
  createdAt: Date;
  updatedAt: Date;
};

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
  // Ai gửi tin cuối — để góc nhìn người xem biết tin cuối là "đến" (đối phương gửi)
  // hay "đi" (chính mình gửi) → tô chấm "tin mới chưa đọc".
  lastSender: DirectSender | null;
  updatedAt: Date | null;
};

export type AppointmentStatus = "Chờ duyệt" | "Đã duyệt";

export type Appointment = {
  id: string;
  patientId: string;
  // `""` = chưa có bác sĩ nhận (lịch ở hàng chờ chung); bác sĩ nào duyệt trước thì nhận.
  doctorId: string;
  scheduledAt: Date;
  // `reason` = tóm tắt triệu chứng/tình trạng do trợ lý ảo tổng hợp từ hội thoại
  // (hiển thị "Tóm tắt từ trợ lý ảo"), KHÔNG phải lời bệnh nhân tự ghi.
  reason: string;
  // `patientNote` = lời nhắn bệnh nhân muốn gửi bác sĩ trước khi khám (tuỳ chọn).
  patientNote?: string;
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
  | "examHistory"
  | false;

// Bác sĩ chỉ sửa phần lâm sàng (khớp PatientUpdateSchema backend). Thông tin cá
// nhân do bệnh nhân tự sửa qua /auth/me/profile; mã BN không ai sửa. Không còn
// PatientCreateInput — bệnh nhân tự đăng ký, bác sĩ KHÔNG tạo/xoá bệnh nhân.
export type PatientUpdateInput = {
  ward?: string;
  diagnoses?: string[];
  medications?: Prescription[];
  vitals?: Partial<Vital>;
};

// Bệnh nhân tự đặt lịch: không truyền patientId (lấy từ JWT); doctorId tuỳ chọn
// (rỗng/không truyền = vào hàng chờ chung).
export type PatientAppointmentCreateInput = {
  scheduledAt: string | Date;
  // Tóm tắt do trợ lý ảo tổng hợp — có thể rỗng (chưa trò chuyện / chưa đủ data).
  reason?: string;
  patientNote?: string;
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
  patientNote?: string;
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

// ─────────────────────────────────────────── Giá dịch vụ khám (DV00X)
// Bảng giá tham khảo các dịch vụ khám của phòng khám. Chỉ ĐỌC (không có UI CRUD,
// không panel) — agent bệnh nhân tra qua tool `read_service_prices`. Tư vấn miễn
// phí; chỉ tính phí khi khám; chi phí cuối phụ thuộc bác sĩ — đây là giá tham khảo.
export type ServiceCategory =
  | "Khám tổng quát"
  | "Khám chuyên khoa"
  | "Chẩn đoán hình ảnh"
  | "Xét nghiệm"
  | "Thủ thuật"
  | "Tiêm chủng – Vắc-xin"
  | "Khám tại nhà";

export type ServicePrice = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number; // VND
  unit: string; // "lần", "lượt", "vùng"…
  description?: string;
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

// ───────────────────────────── Gia đình (theo dõi người nhà) ───────────────
// Nhóm gia đình giúp bệnh nhân cùng theo dõi hồ sơ + kết quả khám của nhau
// (KHÔNG thấy lịch hẹn của nhau, KHÔNG phải nhóm nhắn tin). Mỗi BN thuộc tối đa
// MỘT gia đình (bất biến enforce ở service). Hình thành khi một BN mời người nhà
// theo SĐT và người kia chấp nhận.
export type Family = {
  id: string; // "GD00X"
  name: string;
  memberIds: string[]; // danh sách id bệnh nhân trong nhóm
  createdAt: Date;
  updatedAt: Date;
};

export type FamilyInviteStatus = "pending" | "accepted" | "declined";

export type FamilyInvite = {
  id: string; // "FI00X"
  fromPatientId: string; // người mời (người tạo nhóm khi được chấp nhận)
  toPatientId: string; // người được mời
  status: FamilyInviteStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type FamilyMemberSummary = { id: string; name: string };

// Trả về cho FE: nhóm + danh sách thành viên (tên rút gọn). null = chưa có nhóm.
export type FamilyView = {
  family: { id: string; name: string; createdAt: Date; updatedAt: Date };
  members: FamilyMemberSummary[];
} | null;

// Lời mời đang chờ (góc nhìn người nhận) kèm tên người gửi để hiển thị.
export type FamilyInviteView = {
  id: string;
  fromPatientId: string;
  fromName: string;
  status: FamilyInviteStatus;
  createdAt: Date;
};

// Chi tiết một thành viên cho người cùng nhóm xem: CHỈ hồ sơ + xét nghiệm.
// Dùng Pick để CỐ Ý loại lịch hẹn (thành viên không thấy lịch hẹn của nhau).
export type FamilyMemberDetail = {
  patient: Pick<
    PatientPublic,
    | "id"
    | "name"
    | "age"
    | "gender"
    | "ward"
    | "address"
    | "phone"
    | "diagnoses"
    | "medications"
    | "vitals"
  >;
  labResults: LabResult[];
};


// ───────────────────────────── Đánh giá câu trả lời chatbot (sao) ──────────
// Bệnh nhân chấm 1–5 sao cho từng câu trả lời của AI trong một hội thoại.
// Khoá theo (conversationId, turnIndex) — turnIndex = thứ tự câu trả lời assistant
// trong hội thoại (0-based, tính trên thứ tự lưu ở server). Chuyên gia xem (chỉ đọc).
export type ConversationRating = {
  id: string;
  conversationId: string;
  ownerId: string; // bệnh nhân sở hữu hội thoại
  turnIndex: number;
  stars: number; // 1..5
  createdAt: Date;
  updatedAt: Date;
};

// Bản gọn để FE/audit hiển thị một đánh giá theo lượt.
export type RatingView = {
  turnIndex: number;
  stars: number;
};
