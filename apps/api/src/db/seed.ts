// Seed tổng hợp — chạy MỘT phát: xoá sạch data cũ rồi insert lại toàn bộ data mới.
//   pnpm --filter @pr_hospitalagent/api run seed
//
// Bao trùm 9 collection: patients, doctors, managers, experts, appointments,
// assets, utilities, payroll, revenue. Mỗi collection được deleteMany({}) trước
// khi insert nên chạy lại nhiều lần luôn ra cùng kết quả (idempotent).
//
// Tài khoản đăng nhập (username / password):
//   Bác sĩ:     bs001..bs003 / mkbs001..mkbs003
//   Quản lý:    ql001        / mkql001
//   Chuyên gia: cg001..cg003 / mkcg001..mkcg003
//   Bệnh nhân:  SĐT 0901234001..010 / mkbn001..mkbn010 (đăng nhập bằng SĐT)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { connectDB, client, hashPassword } from "@pr_hospitalagent/api-shared";
import type {
  Patient,
  Boot,
  BootRole,
  Skill,
  Workspace,
  Doctor,
  Manager,
  Expert,
  Appointment,
  Asset,
  AssetCategory,
  AssetCondition,
  Medication,
  MedicationCategory,
  LabCatalogEntry,
  Utility,
  UtilityType,
  UtilityStatus,
  Payroll,
  PayrollStatus,
  Revenue,
  RevenueSource,
  DirectThread,
} from "@pr_hospitalagent/types";
import { computeLab, findLabEntry } from "@pr_hospitalagent/types";
import { periodKey, lastNPeriods } from "../lib/period.ts";
import { labCatalogSeeds } from "./seeds/lab-catalog.ts";

const now = new Date();

// Random giả lập tất định trong [0, 1) để data tài chính lặp lại được.
function rand(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Mốc thời gian cho data tài chính (utilities/payroll/revenue) — 12 tháng tính ngược.
const ANCHOR = new Date(2026, 4, 10);

// ───────────────────────────────────────────────────────── Bệnh nhân (BN00X)
// Bệnh nhân KHÔNG có username — đăng nhập bằng `phone` (vd 0901234001 / mkbn001).
// XN trong seed chỉ cần {name, value, recordedAt} — đơn vị/khoảng tham chiếu/bất thường
// do `buildPatients` suy lại từ danh mục (computeLab). XN ngoài danh mục (chẩn đoán hình
// ảnh, mô tả tự do) phải tự khai unit/referenceRange/isAbnormal vì không tính được.
type LabSeed = {
  name: string;
  value: string | number;
  recordedAt: Date;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
};
type PatientSeedSpec = Omit<
  Patient,
  "username" | "passwordHash" | "labResults"
> & {
  password: string;
  labResults: LabSeed[];
};

const patientSeeds: PatientSeedSpec[] = [
  {
    id: "BN001",
    password: "mkbn001",
    name: "Nguyễn Văn Hùng",
    age: 58,
    gender: "Nam",
    ward: "Nội Tim mạch",
    address: "12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
    phone: "0901234001",
    diagnoses: ["Tăng huyết áp", "Đái tháo đường type 2", "Nghi suy tim mất bù"],
    vitals: { spO2: 91, heartRate: 102, bloodPressure: "148/92", temperature: 37.1, recordedAt: now },
    medications: [
      { name: "Amlodipine 5mg", instruction: "Sáng 1 viên sau ăn" },
      { name: "Metformin 500mg", instruction: "Sáng tối mỗi lần 1 viên sau ăn" },
      { name: "Aspirin 81mg", instruction: "Tối 1 viên sau ăn" },
    ],
    labResults: [
      { name: "NT-proBNP", value: 2840, recordedAt: now },
      { name: "Creatinine", value: 1.4, recordedAt: now },
      { name: "Hb", value: 11.2, recordedAt: now },
      { name: "HbA1c", value: 7.8, recordedAt: now },
    ],
  },
  {
    id: "BN002",
    password: "mkbn002",
    name: "Trần Thị Mai",
    age: 45,
    gender: "Nữ",
    ward: "Nội Tổng quát",
    address: "45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
    phone: "0901234002",
    diagnoses: ["Đau ngực điển hình", "Tăng huyết áp"],
    vitals: { spO2: 97, heartRate: 88, bloodPressure: "160/100", temperature: 36.8, recordedAt: now },
    medications: [
      { name: "Nitroglycerin PRN", instruction: "Ngậm dưới lưỡi khi đau ngực, cách 5 phút/lần, tối đa 3 lần" },
      { name: "Amlodipine 10mg", instruction: "Sáng 1 viên sau ăn" },
    ],
    labResults: [
      { name: "Troponin I", value: 0.08, recordedAt: now },
      { name: "CK-MB", value: 18, recordedAt: now },
      { name: "Cholesterol toàn phần", value: 6.2, recordedAt: now },
    ],
  },
  {
    id: "BN003",
    password: "mkbn003",
    name: "Lê Minh Tuấn",
    age: 32,
    gender: "Nam",
    ward: "Cấp cứu",
    address: "78 Trần Hưng Đạo, Phường Cầu Ông Lãnh, Quận 1, TP.HCM",
    phone: "0901234003",
    diagnoses: ["Chấn thương đầu kín", "GCS 14"],
    vitals: { spO2: 98, heartRate: 78, bloodPressure: "130/80", temperature: 36.9, recordedAt: now },
    medications: [
      { name: "Mannitol 20%", instruction: "Truyền tĩnh mạch theo y lệnh, cách nhau 6 tiếng" },
      { name: "Paracetamol 1g IV", instruction: "Truyền tĩnh mạch khi sốt > 38.5°C, cách tối thiểu 6 tiếng" },
    ],
    labResults: [
      { name: "CT sọ não", value: "Không xuất huyết", unit: "", referenceRange: "Bình thường", isAbnormal: false, recordedAt: now },
      { name: "CBC", value: "Bình thường", unit: "", referenceRange: "Bình thường", isAbnormal: false, recordedAt: now },
      { name: "Glucose", value: 5.8, recordedAt: now },
    ],
  },
  {
    id: "BN004",
    password: "mkbn004",
    name: "Phạm Thị Hạnh",
    age: 67,
    gender: "Nữ",
    ward: "Hô hấp",
    address: "23 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM",
    phone: "0901234004",
    diagnoses: ["COPD đợt cấp", "Suy hô hấp type 2"],
    vitals: { spO2: 86, heartRate: 112, bloodPressure: "138/84", temperature: 37.6, recordedAt: now },
    medications: [
      { name: "Salbutamol khí dung", instruction: "Khí dung mỗi 6 tiếng, thêm liều khi khó thở" },
      { name: "Ipratropium khí dung", instruction: "Khí dung mỗi 8 tiếng" },
      { name: "Methylprednisolone 40mg IV", instruction: "Tiêm tĩnh mạch sáng tối, cách nhau 12 tiếng" },
    ],
    labResults: [
      { name: "pH máu", value: 7.31, recordedAt: now },
      { name: "PaCO2", value: 58, recordedAt: now },
      { name: "PaO2", value: 54, recordedAt: now },
      { name: "Bạch cầu", value: 13.8, recordedAt: now },
    ],
  },
  {
    id: "BN005",
    password: "mkbn005",
    name: "Hoàng Văn Phúc",
    age: 71,
    gender: "Nam",
    ward: "Nội Thận",
    address: "56 Võ Văn Tần, Phường 6, Quận 3, TP.HCM",
    phone: "0901234005",
    diagnoses: ["Bệnh thận mạn giai đoạn 4", "Tăng huyết áp", "Thiếu máu mạn"],
    vitals: { spO2: 96, heartRate: 84, bloodPressure: "152/88", temperature: 36.7, recordedAt: now },
    medications: [
      { name: "Losartan 50mg", instruction: "Sáng 1 viên sau ăn" },
      { name: "Furosemide 40mg", instruction: "Sáng 1 viên trước ăn, tránh uống buổi tối" },
      { name: "Erythropoietin tiêm dưới da", instruction: "Tiêm dưới da 3 lần/tuần (thứ 2-4-6)" },
      { name: "Calcium carbonate 500mg", instruction: "Sáng tối mỗi lần 1 viên trong bữa ăn" },
    ],
    labResults: [
      { name: "Creatinine", value: 3.6, recordedAt: now },
      { name: "eGFR", value: 22, recordedAt: now },
      { name: "Kali", value: 5.6, recordedAt: now },
      { name: "Hb", value: 9.4, recordedAt: now },
    ],
  },
  {
    id: "BN006",
    password: "mkbn006",
    name: "Vũ Thị Ngọc",
    age: 29,
    gender: "Nữ",
    ward: "Sản",
    address: "89 Cách Mạng Tháng 8, Phường 7, Quận 3, TP.HCM",
    phone: "0901234006",
    diagnoses: ["Tiền sản giật nặng", "Thai 34 tuần"],
    vitals: { spO2: 98, heartRate: 96, bloodPressure: "168/108", temperature: 36.9, recordedAt: now },
    medications: [
      { name: "Magnesium sulfate IV", instruction: "Truyền tĩnh mạch liên tục theo y lệnh, theo dõi phản xạ gân xương" },
      { name: "Methyldopa 250mg", instruction: "Sáng tối mỗi lần 1 viên" },
      { name: "Betamethasone 12mg IM", instruction: "Tiêm bắp 1 lần, lặp lại sau 24 tiếng" },
    ],
    labResults: [
      { name: "Protein niệu 24h", value: 4.2, unit: "g/24h", referenceRange: "<0.3", isAbnormal: true, recordedAt: now },
      { name: "Tiểu cầu", value: 92, recordedAt: now },
      { name: "AST", value: 78, recordedAt: now },
      { name: "Acid uric", value: 7.8, recordedAt: now },
    ],
  },
  {
    id: "BN007",
    password: "mkbn007",
    name: "Đặng Minh Khôi",
    age: 8,
    gender: "Nam",
    ward: "Nhi",
    address: "34 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM",
    phone: "0901234007",
    diagnoses: ["Sốt xuất huyết Dengue ngày 5", "Cảnh báo dấu hiệu nặng"],
    vitals: { spO2: 97, heartRate: 124, bloodPressure: "92/58", temperature: 38.4, recordedAt: now },
    medications: [
      { name: "Paracetamol 250mg", instruction: "Uống khi sốt > 38.5°C, cách tối thiểu 6 tiếng" },
      { name: "Ringer lactate truyền tĩnh mạch", instruction: "Truyền tĩnh mạch theo y lệnh bù dịch" },
    ],
    labResults: [
      { name: "Tiểu cầu", value: 38, recordedAt: now },
      { name: "Hematocrit", value: 48, recordedAt: now },
      { name: "NS1 Dengue", value: "Dương tính", recordedAt: now },
      { name: "AST", value: 132, recordedAt: now },
    ],
  },
  {
    id: "BN008",
    password: "mkbn008",
    name: "Bùi Văn Thành",
    age: 64,
    gender: "Nam",
    ward: "Thần kinh",
    address: "67 Phan Đăng Lưu, Phường 3, Quận Phú Nhuận, TP.HCM",
    phone: "0901234008",
    diagnoses: ["Đột quỵ nhồi máu não cấp", "Rung nhĩ", "Tăng huyết áp"],
    vitals: { spO2: 95, heartRate: 108, bloodPressure: "172/96", temperature: 36.8, recordedAt: now },
    medications: [
      { name: "Alteplase tiêu sợi huyết", instruction: "Truyền tĩnh mạch theo phác đồ tiêu sợi huyết cấp" },
      { name: "Aspirin 81mg", instruction: "Tối 1 viên sau ăn" },
      { name: "Atorvastatin 40mg", instruction: "Tối 1 viên sau ăn" },
    ],
    labResults: [
      { name: "MRI sọ não", value: "Nhồi máu vùng MCA trái", unit: "", referenceRange: "Bình thường", isAbnormal: true, recordedAt: now },
      { name: "INR", value: 1.1, recordedAt: now },
      { name: "Glucose", value: 8.4, recordedAt: now },
      { name: "LDL-C", value: 4.6, recordedAt: now },
    ],
  },
  {
    id: "BN009",
    password: "mkbn009",
    name: "Ngô Thị Bích",
    age: 52,
    gender: "Nữ",
    ward: "Tiêu hóa",
    address: "90 Nguyễn Văn Cừ, Phường 2, Quận 5, TP.HCM",
    phone: "0901234009",
    diagnoses: ["Viêm tụy cấp do sỏi mật", "Mất nước độ 2"],
    vitals: { spO2: 96, heartRate: 116, bloodPressure: "104/68", temperature: 38.1, recordedAt: now },
    medications: [
      { name: "Ringer lactate truyền tĩnh mạch", instruction: "Truyền tĩnh mạch theo y lệnh bù dịch" },
      { name: "Pethidine 50mg IM", instruction: "Tiêm bắp khi đau nhiều, cách tối thiểu 6 tiếng" },
      { name: "Pantoprazole 40mg IV", instruction: "Tiêm tĩnh mạch sáng tối, cách nhau 12 tiếng" },
      { name: "Cefoperazone-sulbactam 2g IV", instruction: "Tiêm tĩnh mạch mỗi 12 tiếng" },
    ],
    labResults: [
      { name: "Amylase", value: 824, recordedAt: now },
      { name: "Lipase", value: 1450, recordedAt: now },
      { name: "Bạch cầu", value: 16.4, recordedAt: now },
      { name: "CRP", value: 142, recordedAt: now },
    ],
  },
  {
    id: "BN010",
    password: "mkbn010",
    name: "Đỗ Văn Lâm",
    age: 74,
    gender: "Nam",
    ward: "Truyền nhiễm",
    address: "11 Lý Thường Kiệt, Phường 7, Quận 10, TP.HCM",
    phone: "0901234010",
    diagnoses: ["Viêm phổi cộng đồng nặng", "Nhiễm khuẩn huyết", "Đái tháo đường type 2"],
    vitals: { spO2: 89, heartRate: 122, bloodPressure: "98/56", temperature: 39.2, recordedAt: now },
    medications: [
      { name: "Ceftriaxone 2g IV", instruction: "Tiêm tĩnh mạch 1 lần/ngày buổi sáng" },
      { name: "Levofloxacin 750mg IV", instruction: "Truyền tĩnh mạch 1 lần/ngày" },
      { name: "Noradrenaline truyền liên tục", instruction: "Truyền tĩnh mạch liên tục, chỉnh liều theo huyết áp" },
      { name: "Insulin Actrapid theo thang", instruction: "Tiêm dưới da theo thang đường huyết mao mạch" },
    ],
    labResults: [
      { name: "Bạch cầu", value: 19.6, recordedAt: now },
      { name: "Procalcitonin", value: 12.4, recordedAt: now },
      { name: "Lactate", value: 3.8, recordedAt: now },
      { name: "X-quang ngực", value: "Đông đặc thùy dưới phải", unit: "", referenceRange: "Bình thường", isAbnormal: true, recordedAt: now },
      { name: "HbA1c", value: 8.9, recordedAt: now },
    ],
  },
];

// ───────────────────────────────────────────────────────── Bác sĩ (BS00X)
// Phân bổ bệnh nhân (BN009/BN010 để trống → test luồng hàng chờ chung).
const patientIds = patientSeeds.map((p) => p.id);
const managedByDoctor: Record<string, string[]> = {
  BS001: patientIds.slice(0, 4), // BN001–BN004
  BS002: patientIds.slice(4, 7), // BN005–BN007
  BS003: patientIds.slice(7, 8), // BN008
};

type DoctorSeed = {
  id: string;
  username: string;
  password: string;
  fullName: string;
  title: string;
  department: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
  workspaceDir: string;
};

const doctorSeeds: DoctorSeed[] = [
  {
    id: "BS001",
    username: "bs001",
    password: "mkbs001",
    fullName: "BS. Trần Quang Minh",
    title: "Bác sĩ chuyên khoa I",
    department: "Nội Tim mạch",
    specialty: "Suy tim, tăng huyết áp, rối loạn nhịp",
    phone: "0901234567",
    email: "minh.tran@hospital.vn",
    address: "12 Lê Lợi, Quận 1, TP.HCM",
    workspaceDir: "workspaces/BS001",
  },
  {
    id: "BS002",
    username: "bs002",
    password: "mkbs002",
    fullName: "ThS.BS. Nguyễn Thị Hương",
    title: "Thạc sĩ, Bác sĩ",
    department: "Cấp cứu",
    specialty: "Hồi sức cấp cứu, chấn thương",
    phone: "0912345678",
    email: "huong.nguyen@hospital.vn",
    address: "45 Nguyễn Trãi, Quận 5, TP.HCM",
    workspaceDir: "workspaces/BS002",
  },
  {
    id: "BS003",
    username: "bs003",
    password: "mkbs003",
    fullName: "BS. Lê Hoàng Nam",
    title: "Bác sĩ",
    department: "Nhi",
    specialty: "Nhi tổng quát, sốt xuất huyết",
    phone: "0923456789",
    email: "nam.le@hospital.vn",
    address: "78 Hai Bà Trưng, Quận 3, TP.HCM",
    workspaceDir: "workspaces/BS003",
  },
];

// ───────────────────────────────────────────────────────── Quản lý (QL00X)
const managerSeed = {
  id: "QL001",
  username: "ql001",
  password: "mkql001",
  fullName: "Phạm Thanh Tùng",
  title: "Giám đốc phòng khám",
  clinicName: "Phòng khám Đa khoa Hồng Đức",
  phone: "0987654321",
  email: "tung.pham@hongduc-clinic.vn",
  address: "168 Nguyễn Văn Cừ, Quận 5, TP.HCM",
};

// ───────────────────────────────────────────────────────── Chuyên gia (CG00X)
type ExpertSeed = {
  id: string;
  username: string;
  password: string;
  fullName: string;
  title: string;
  expertise: string;
  phone: string;
  email: string;
  address: string;
};

const expertSeeds: ExpertSeed[] = [
  {
    id: "CG001",
    username: "cg001",
    password: "mkcg001",
    fullName: "Trần Minh Khoa",
    title: "Chuyên gia huấn luyện AI",
    expertise: "Prompt engineering — y khoa",
    phone: "0901234567",
    email: "khoa.tran@hospitalai.vn",
    address: "45 Lê Duẩn, Quận 1, TP.HCM",
  },
  {
    id: "CG002",
    username: "cg002",
    password: "mkcg002",
    fullName: "Nguyễn Thị Lan",
    title: "Chuyên gia quy trình lâm sàng",
    expertise: "Quy trình khám bệnh & chuẩn hoá giao tiếp",
    phone: "0912345678",
    email: "lan.nguyen@hospitalai.vn",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  },
  {
    id: "CG003",
    username: "cg003",
    password: "mkcg003",
    fullName: "Phạm Đức Thành",
    title: "Chuyên gia dữ liệu y tế",
    expertise: "Chuẩn hoá dữ liệu & kiểm soát chất lượng AI",
    phone: "0923456789",
    email: "thanh.pham@hospitalai.vn",
    address: "88 Điện Biên Phủ, Quận 3, TP.HCM",
  },
];

// ───────────────────────────────────────────────────────── Lịch hẹn (APT00X)
function at(daysFromNow: number, hour: number, minute: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const appointmentSeeds: Appointment[] = [
  { id: "APT001", patientId: "BN001", doctorId: "BS001", scheduledAt: at(1, 8, 0), reason: "Tái khám tăng huyết áp, kiểm tra HA và điều chỉnh thuốc", status: "Chờ duyệt", createdAt: now, updatedAt: now },
  { id: "APT002", patientId: "BN002", doctorId: "BS001", scheduledAt: at(2, 9, 30), reason: "Đánh giá sau đợt nhồi máu cơ tim, xem ECG", status: "Đã duyệt", createdAt: now, updatedAt: now },
  { id: "APT003", patientId: "BN004", doctorId: "BS002", scheduledAt: at(1, 14, 0), reason: "Theo dõi COPD đợt cấp, kiểm tra SpO2 và khí máu", status: "Chờ duyệt", createdAt: now, updatedAt: now },
  { id: "APT004", patientId: "BN007", doctorId: "BS003", scheduledAt: at(4, 10, 0), reason: "Tái khám sốt xuất huyết, đếm tiểu cầu", status: "Đã duyệt", createdAt: now, updatedAt: now },
  { id: "APT005", patientId: "BN006", doctorId: "BS002", scheduledAt: at(3, 15, 30), reason: "Hội chẩn tiền sản giật, đo HA và protein niệu", status: "Đã duyệt", createdAt: now, updatedAt: now },
];

// ───────────────────────────────────────────────────────── Tài sản (TS00X)
type AssetSeed = {
  name: string;
  category: AssetCategory;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  depreciationYears: number;
  condition: AssetCondition;
  notes?: string;
};

const assetSeeds: AssetSeed[] = [
  { name: "Máy siêu âm GE Logiq P9", category: "Thiết bị y tế", location: "Phòng siêu âm 1", purchaseDate: "2023-03-15", purchasePrice: 850_000_000, depreciationYears: 8, condition: "Tốt", notes: "Bảo hành đến 2027" },
  { name: "Máy điện tim Nihon Kohden ECG-1250K", category: "Thiết bị y tế", location: "Phòng khám tim mạch", purchaseDate: "2024-01-10", purchasePrice: 95_000_000, depreciationYears: 7, condition: "Tốt" },
  { name: "Máy xét nghiệm sinh hóa Mindray BS-240", category: "Thiết bị y tế", location: "Phòng xét nghiệm", purchaseDate: "2022-08-05", purchasePrice: 320_000_000, depreciationYears: 8, condition: "Bình thường", notes: "Cần hiệu chuẩn định kỳ" },
  { name: "Bàn khám đa năng inox", category: "Nội thất", location: "Phòng khám 2", purchaseDate: "2024-05-20", purchasePrice: 12_500_000, depreciationYears: 10, condition: "Tốt" },
  { name: "Tủ đựng thuốc 6 ngăn", category: "Nội thất", location: "Quầy thuốc", purchaseDate: "2023-11-12", purchasePrice: 8_900_000, depreciationYears: 10, condition: "Tốt" },
  { name: "Ghế chờ inox 4 chỗ x10", category: "Nội thất", location: "Sảnh chờ", purchaseDate: "2022-04-22", purchasePrice: 24_000_000, depreciationYears: 8, condition: "Bình thường" },
  { name: "Máy tính Dell OptiPlex 7090 x6", category: "Máy tính", location: "Lễ tân + phòng khám", purchaseDate: "2023-09-01", purchasePrice: 102_000_000, depreciationYears: 5, condition: "Tốt" },
  { name: "Máy in HP LaserJet Pro M404", category: "Máy tính", location: "Lễ tân", purchaseDate: "2022-06-18", purchasePrice: 6_500_000, depreciationYears: 5, condition: "Cần sửa", notes: "Hay kẹt giấy" },
  { name: "Switch mạng Cisco SG350-28P", category: "Máy tính", location: "Phòng kỹ thuật", purchaseDate: "2024-02-14", purchasePrice: 18_500_000, depreciationYears: 6, condition: "Tốt" },
  { name: "Máy lạnh Daikin Inverter 12000BTU x4", category: "Khác", location: "Phòng khám 1-4", purchaseDate: "2023-04-10", purchasePrice: 56_000_000, depreciationYears: 8, condition: "Tốt" },
  { name: "Hệ thống camera giám sát 8 kênh", category: "Khác", location: "Toàn phòng khám", purchaseDate: "2022-12-05", purchasePrice: 22_000_000, depreciationYears: 6, condition: "Bình thường" },
  { name: "Tủ lạnh bảo quản vắc-xin Haier 100L", category: "Thiết bị y tế", location: "Kho vắc-xin", purchaseDate: "2024-07-20", purchasePrice: 35_000_000, depreciationYears: 7, condition: "Tốt" },
];

// ─────────────────────────────────────────────────── Danh mục thuốc (TH00X)
// Catalog thuốc cho form chọn thuốc của bác sĩ. PHẢI bao trùm mọi tên thuốc
// đang kê cho bệnh nhân ở patientSeeds (để mở picker là khớp đúng, không "mồ côi").
type MedicationSeed = { name: string; category: MedicationCategory };

const medicationSeeds: MedicationSeed[] = [
  // Kháng sinh
  { name: "Amoxicillin 500mg", category: "Kháng sinh" },
  { name: "Azithromycin 500mg", category: "Kháng sinh" },
  { name: "Cefuroxime 500mg", category: "Kháng sinh" },
  { name: "Cefoperazone-sulbactam 2g IV", category: "Kháng sinh" },
  { name: "Ceftriaxone 2g IV", category: "Kháng sinh" },
  { name: "Levofloxacin 750mg IV", category: "Kháng sinh" },
  // Tim mạch – Huyết áp
  { name: "Amlodipine 5mg", category: "Tim mạch – Huyết áp" },
  { name: "Amlodipine 10mg", category: "Tim mạch – Huyết áp" },
  { name: "Losartan 50mg", category: "Tim mạch – Huyết áp" },
  { name: "Methyldopa 250mg", category: "Tim mạch – Huyết áp" },
  { name: "Bisoprolol 5mg", category: "Tim mạch – Huyết áp" },
  { name: "Enalapril 10mg", category: "Tim mạch – Huyết áp" },
  { name: "Atorvastatin 40mg", category: "Tim mạch – Huyết áp" },
  { name: "Aspirin 81mg", category: "Tim mạch – Huyết áp" },
  { name: "Clopidogrel 75mg", category: "Tim mạch – Huyết áp" },
  { name: "Nitroglycerin PRN", category: "Tim mạch – Huyết áp" },
  { name: "Alteplase tiêu sợi huyết", category: "Tim mạch – Huyết áp" },
  // Lợi tiểu – Thận
  { name: "Furosemide 40mg", category: "Lợi tiểu – Thận" },
  { name: "Spironolactone 25mg", category: "Lợi tiểu – Thận" },
  { name: "Hydrochlorothiazide 25mg", category: "Lợi tiểu – Thận" },
  { name: "Mannitol 20%", category: "Lợi tiểu – Thận" },
  { name: "Erythropoietin tiêm dưới da", category: "Lợi tiểu – Thận" },
  { name: "Calcium carbonate 500mg", category: "Lợi tiểu – Thận" },
  // Tiểu đường
  { name: "Metformin 500mg", category: "Tiểu đường" },
  { name: "Gliclazide 30mg", category: "Tiểu đường" },
  { name: "Insulin Actrapid theo thang", category: "Tiểu đường" },
  { name: "Insulin glargine tiêm dưới da", category: "Tiểu đường" },
  // Giảm đau – Hạ sốt
  { name: "Paracetamol 250mg", category: "Giảm đau – Hạ sốt" },
  { name: "Paracetamol 500mg", category: "Giảm đau – Hạ sốt" },
  { name: "Paracetamol 1g IV", category: "Giảm đau – Hạ sốt" },
  { name: "Ibuprofen 400mg", category: "Giảm đau – Hạ sốt" },
  { name: "Diclofenac 50mg", category: "Giảm đau – Hạ sốt" },
  { name: "Pethidine 50mg IM", category: "Giảm đau – Hạ sốt" },
  // Hô hấp
  { name: "Salbutamol khí dung", category: "Hô hấp" },
  { name: "Ipratropium khí dung", category: "Hô hấp" },
  { name: "Budesonide khí dung", category: "Hô hấp" },
  { name: "Montelukast 10mg", category: "Hô hấp" },
  { name: "Methylprednisolone 40mg IV", category: "Hô hấp" },
  // Tiêu hóa
  { name: "Omeprazole 20mg", category: "Tiêu hóa" },
  { name: "Pantoprazole 40mg IV", category: "Tiêu hóa" },
  { name: "Domperidone 10mg", category: "Tiêu hóa" },
  { name: "Oresol bù điện giải", category: "Tiêu hóa" },
  // Dịch truyền – Khác
  { name: "Ringer lactate truyền tĩnh mạch", category: "Dịch truyền – Khác" },
  { name: "Magnesium sulfate IV", category: "Dịch truyền – Khác" },
  { name: "Betamethasone 12mg IM", category: "Dịch truyền – Khác" },
  { name: "Noradrenaline truyền liên tục", category: "Dịch truyền – Khác" },
];

// ─────────────────────────────────────────────────── Điện nước (UT00X)
type UtilityRecipe = {
  type: UtilityType;
  baseAmount: number;
  baseUsage: number;
  unit: string;
  amountVar: number;
  usageVar: number;
};

const utilityRecipes: UtilityRecipe[] = [
  { type: "Điện", baseAmount: 12_500_000, baseUsage: 4200, unit: "kWh", amountVar: 0.18, usageVar: 0.16 },
  { type: "Nước", baseAmount: 2_400_000, baseUsage: 180, unit: "m³", amountVar: 0.12, usageVar: 0.1 },
  { type: "Internet", baseAmount: 1_800_000, baseUsage: 1, unit: "tháng", amountVar: 0, usageVar: 0 },
];

// ─────────────────────────────────────────────────── Doanh thu (DT00X)
type RevenueRecipe = {
  source: RevenueSource;
  baseTotal: number;
  entriesPerMonth: number;
  variance: number;
};

const revenueRecipes: RevenueRecipe[] = [
  { source: "Khám bệnh", baseTotal: 95_000_000, entriesPerMonth: 8, variance: 0.22 },
  { source: "Xét nghiệm", baseTotal: 42_000_000, entriesPerMonth: 5, variance: 0.2 },
  { source: "Bán thuốc", baseTotal: 28_000_000, entriesPerMonth: 4, variance: 0.18 },
  { source: "Dịch vụ khác", baseTotal: 12_000_000, entriesPerMonth: 3, variance: 0.3 },
];

function daysInMonth(period: string): number {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(y, m, 0).getDate();
}

// ───────────────────────────────────────────────────────── Build documents
function buildPatients(): Patient[] {
  return patientSeeds.map(({ password, ...rest }) => ({
    ...rest,
    // Suy unit/referenceRange/isAbnormal từ danh mục (nguồn sự thật) — KHÔNG seed sẵn
    // trường bất thường (vd Hb 11.2 < 13 tự ra bất thường). XN ngoài danh mục giữ giá trị tự khai.
    labResults: rest.labResults.map((lab) => {
      const entry = findLabEntry(labCatalogSeeds, lab.name);
      if (entry) return computeLab(lab.name, lab.value, entry, lab.recordedAt);
      return {
        name: lab.name,
        value: lab.value,
        unit: lab.unit ?? "",
        referenceRange: lab.referenceRange ?? "",
        isAbnormal: lab.isAbnormal ?? false,
        recordedAt: lab.recordedAt,
      };
    }),
    passwordHash: hashPassword(password),
  }));
}

function buildDoctors(): Doctor[] {
  return doctorSeeds.map(({ password, ...rest }) => ({
    ...rest,
    passwordHash: hashPassword(password),
    patientIds: managedByDoctor[rest.id] ?? [],
    createdAt: now,
  }));
}

function buildManager(): Manager {
  const { password, ...rest } = managerSeed;
  return { ...rest, passwordHash: hashPassword(password), createdAt: now };
}

function buildExperts(): Expert[] {
  return expertSeeds.map(({ password, ...rest }) => ({
    ...rest,
    passwordHash: hashPassword(password),
    createdAt: now,
  }));
}

function buildAssets(): Asset[] {
  return assetSeeds.map((s, i) => ({
    id: "TS" + String(i + 1).padStart(3, "0"),
    name: s.name,
    category: s.category,
    location: s.location,
    purchaseDate: new Date(s.purchaseDate),
    purchasePrice: s.purchasePrice,
    depreciationYears: s.depreciationYears,
    condition: s.condition,
    notes: s.notes,
    createdAt: now,
  }));
}

function buildMedications(): Medication[] {
  return medicationSeeds.map((s, i) => ({
    id: "TH" + String(i + 1).padStart(3, "0"),
    name: s.name,
    category: s.category,
    createdAt: now,
  }));
}

function buildUtilities(): Utility[] {
  const periods = lastNPeriods(12, ANCHOR);
  const currentPeriod = periodKey(ANCHOR);
  const docs: Utility[] = [];
  let seq = 1;
  for (let pi = 0; pi < periods.length; pi++) {
    const p = periods[pi]!;
    for (let ri = 0; ri < utilityRecipes.length; ri++) {
      const r = utilityRecipes[ri]!;
      const f1 = rand(pi * 7 + ri);
      const f2 = rand(pi * 13 + ri + 1);
      const amount = Math.round(r.baseAmount * (1 + (f1 - 0.5) * 2 * r.amountVar));
      const usage = Math.round(r.baseUsage * (1 + (f2 - 0.5) * 2 * r.usageVar));
      const isCurrent = p === currentPeriod;
      const status: UtilityStatus = isCurrent
        ? rand(pi + ri) < 0.5
          ? "Chưa thanh toán"
          : "Đã thanh toán"
        : "Đã thanh toán";
      const [yy, mm] = p.split("-").map(Number) as [number, number];
      const paidDate = status === "Đã thanh toán" ? new Date(yy, mm - 1, 5) : null;
      docs.push({
        id: "UT" + String(seq++).padStart(3, "0"),
        type: r.type,
        period: p,
        amount,
        usage,
        unit: r.unit,
        paidDate,
        status,
        createdAt: now,
      });
    }
  }
  return docs;
}

function buildPayroll(): Payroll[] {
  // Danh sách nhân viên dựng thẳng từ các mảng seed phía trên (KHÔNG query DB).
  const employees: { id: string; role: "doctor" | "expert" | "manager"; name: string; baseSalary: number }[] = [
    ...doctorSeeds.map((d, i) => ({
      id: d.id,
      role: "doctor" as const,
      name: `${d.title} ${d.fullName}`.trim(),
      baseSalary: 28_000_000 + i * 1_500_000,
    })),
    ...expertSeeds.map((e, i) => ({
      id: e.id,
      role: "expert" as const,
      name: `${e.title} ${e.fullName}`.trim(),
      baseSalary: 25_000_000 + i * 1_200_000,
    })),
    {
      id: managerSeed.id,
      role: "manager" as const,
      name: `${managerSeed.title} ${managerSeed.fullName}`.trim(),
      baseSalary: 35_000_000,
    },
  ];

  const periods = lastNPeriods(12, ANCHOR);
  const currentPeriod = periodKey(ANCHOR);
  const docs: Payroll[] = [];
  let seq = 1;
  for (let pi = 0; pi < periods.length; pi++) {
    const p = periods[pi]!;
    const isCurrent = p === currentPeriod;
    for (let ei = 0; ei < employees.length; ei++) {
      const e = employees[ei]!;
      const r = rand(pi * 17 + ei * 3);
      const r2 = rand(pi * 23 + ei * 5);
      const bonus = Math.round(e.baseSalary * (0.05 + r * 0.15));
      const deduction = Math.round(e.baseSalary * (r2 * 0.04));
      const net = e.baseSalary + bonus - deduction;
      const status: PayrollStatus = isCurrent ? (r < 0.4 ? "Chưa thanh toán" : "Đã thanh toán") : "Đã thanh toán";
      const [yy, mm] = p.split("-").map(Number) as [number, number];
      const paidDate = status === "Đã thanh toán" ? new Date(yy, mm - 1, 28) : null;
      docs.push({
        id: "LG" + String(seq++).padStart(3, "0"),
        employeeId: e.id,
        employeeRole: e.role,
        employeeName: e.name,
        period: p,
        baseSalary: e.baseSalary,
        bonus,
        deduction,
        net,
        paidDate,
        status,
        createdAt: now,
      });
    }
  }
  return docs;
}

function buildRevenue(): Revenue[] {
  const periods = lastNPeriods(12, ANCHOR);
  const docs: Revenue[] = [];
  let seq = 1;
  for (let pi = 0; pi < periods.length; pi++) {
    const p = periods[pi]!;
    const [yy, mm] = p.split("-").map(Number) as [number, number];
    const dim = daysInMonth(p);
    for (let ri = 0; ri < revenueRecipes.length; ri++) {
      const r = revenueRecipes[ri]!;
      const monthFactor = 1 + (rand(pi * 11 + ri) - 0.5) * 2 * r.variance;
      const monthTotal = Math.round(r.baseTotal * monthFactor);
      const slices: number[] = [];
      let remaining = monthTotal;
      for (let i = 0; i < r.entriesPerMonth; i++) {
        if (i === r.entriesPerMonth - 1) {
          slices.push(Math.max(0, remaining));
        } else {
          const f = 0.5 + rand(pi * 31 + ri * 7 + i) * 1.0;
          const share = Math.round((monthTotal / r.entriesPerMonth) * f);
          const s = Math.min(share, remaining - (r.entriesPerMonth - i - 1));
          slices.push(Math.max(0, s));
          remaining -= s;
        }
      }
      for (let i = 0; i < slices.length; i++) {
        const day = Math.max(1, Math.min(dim, Math.floor(rand(pi * 41 + ri * 11 + i) * dim) + 1));
        docs.push({
          id: "DT" + String(seq++).padStart(3, "0"),
          source: r.source,
          period: p,
          amount: slices[i]!,
          date: new Date(yy, mm - 1, day),
          createdAt: now,
        });
      }
    }
  }
  return docs;
}

// ───────────────────────────────────────── Boots + Skills (đọc từ file .md)
// File markdown nằm trong seeds/ chỉ còn đóng vai trò fixture nguồn — runtime
// agent đọc boots/skills từ Mongo qua REST, không đọc thư mục mã nguồn nữa.
const SEEDS_DIR = join(import.meta.dirname, "seeds");

function buildBoots(): Boot[] {
  const roles: BootRole[] = ["doctor", "patient"];
  return roles.map((role) => ({
    role,
    content: readFileSync(join(SEEDS_DIR, "boots", role, "AGENT.md"), "utf8"),
    updatedAt: now,
  }));
}

function buildSkills(): Skill[] {
  const dir = join(SEEDS_DIR, "skills");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      content: readFileSync(join(dir, e.name, "SKILL.md"), "utf8"),
      createdAt: now,
      updatedAt: now,
    }));
}

// ───────────────────────────────── Workspaces (cá nhân hóa: memory/soul/user)
// 1 doc/user (key = id doctor/patient). memory rỗng cho tất cả. soul + user chỉ
// seed nội dung cho BS001 + BN001 (demo cá nhân hóa); còn lại rỗng.
const BS001_USER = `# Hồ sơ bác sĩ

- **Họ tên:** BS. Trần Quang Minh
- **Chức danh:** Bác sĩ chuyên khoa I — khoa Nội Tim mạch
- **Chuyên môn:** Suy tim, tăng huyết áp, rối loạn nhịp
- **Mã bác sĩ:** BS001

## Bối cảnh công việc
- Quản lý nhóm bệnh nhân tim mạch (BN001–BN004).
- Theo dõi sát huyết áp, NT-proBNP và chức năng thận cho bệnh nhân suy tim.
- Thường kê Amlodipine, Losartan, Furosemide — lưu ý tương tác và độ lọc cầu thận.
`;

const BS001_SOUL = `# Phong cách làm việc mong muốn

- Trả lời **ngắn gọn, đi thẳng trọng tâm lâm sàng**, dùng thuật ngữ y khoa tiếng Việt chuẩn.
- Khi tóm tắt bệnh nhân: chẩn đoán → sinh hiệu bất thường → xét nghiệm bất thường → hướng xử trí.
- Luôn cảnh báo khi có chỉ số nguy hiểm (SpO2 thấp, HA quá cao, kali cao…).
- Chủ động nhắc các xét nghiệm theo dõi và lịch tái khám còn thiếu.
`;

const BN001_USER = `# Hồ sơ cá nhân

- **Họ tên:** Nguyễn Văn Hùng
- **Tuổi:** 58 — **Giới:** Nam
- **Bệnh nền:** Tăng huyết áp, Đái tháo đường type 2, nghi suy tim mất bù
- **Thuốc đang dùng:** Amlodipine 5mg, Metformin 500mg, Aspirin 81mg

## Lưu ý
- Đang điều trị tại khoa Nội Tim mạch (BS. Trần Quang Minh quản lý).
- Cần kiểm soát huyết áp và đường huyết đều đặn.
`;

const BN001_SOUL = `# Mong muốn khi trò chuyện

- Giải thích bằng **ngôn ngữ đơn giản, dễ hiểu**; hạn chế thuật ngữ, nếu dùng thì giải thích kèm.
- Giọng điệu **nhẹ nhàng, trấn an**, tránh gây lo lắng.
- Nhắc lịch uống thuốc và tái khám một cách thân thiện.
- Khi có dấu hiệu nguy hiểm thì khuyên đi khám ngay, nhưng không hù dọa.
`;

function buildWorkspaces(): Workspace[] {
  const docs: Workspace[] = [];
  for (const d of doctorSeeds) {
    docs.push({
      id: d.id,
      memory: "",
      soul: d.id === "BS001" ? BS001_SOUL : "",
      user: d.id === "BS001" ? BS001_USER : "",
      updatedAt: now,
    });
  }
  for (const p of patientSeeds) {
    docs.push({
      id: p.id,
      memory: "",
      soul: p.id === "BN001" ? BN001_SOUL : "",
      user: p.id === "BN001" ? BN001_USER : "",
      updatedAt: now,
    });
  }
  return docs;
}

// ───────────────────────── Tin nhắn trực tiếp 1-1 bác sĩ ↔ bệnh nhân ───────
// Mỗi cặp (doctorId, patientId) = 1 thread. `sender` = "doctor" | "patient".
// Chỉ seed vài cặp có hội thoại; các BN quản lý còn lại để trống (bác sĩ chủ
// động hỏi sau). minutesAgo: tin cũ → mới dần theo thứ tự trong mảng.
function dm(minutesAgo: number): Date {
  return new Date(now.getTime() - minutesAgo * 60_000);
}

const directMessageSeeds: DirectThread[] = [
  {
    id: "DM001",
    doctorId: "BS001",
    patientId: "BN001",
    messages: [
      {
        sender: "doctor",
        content:
          "Chào bác Hùng, tôi là BS. Trần Quang Minh. Huyết áp sáng nay bác đo được bao nhiêu ạ?",
        createdAt: dm(180),
      },
      {
        sender: "patient",
        content: "Chào bác sĩ, sáng nay tôi đo được 150/95, hơi cao bác sĩ ạ.",
        createdAt: dm(150),
      },
      {
        sender: "doctor",
        content:
          "Bác nhớ uống Amlodipine đều mỗi sáng nhé, giảm muối trong bữa ăn. Tuần sau tái khám tôi sẽ điều chỉnh liều nếu cần.",
        createdAt: dm(140),
      },
      {
        sender: "patient",
        content: "Vâng tôi cảm ơn bác sĩ.",
        createdAt: dm(120),
      },
    ],
    createdAt: dm(180),
    updatedAt: dm(120),
  },
  {
    id: "DM002",
    doctorId: "BS001",
    patientId: "BN002",
    messages: [
      {
        sender: "doctor",
        content:
          "Chào chị Mai, sau đợt nhồi máu cơ tim chị thấy còn đau ngực hay khó thở khi gắng sức không ạ?",
        createdAt: dm(90),
      },
      {
        sender: "patient",
        content: "Dạ thỉnh thoảng leo cầu thang em vẫn hơi mệt bác sĩ ạ.",
        createdAt: dm(60),
      },
    ],
    createdAt: dm(90),
    updatedAt: dm(60),
  },
  {
    id: "DM003",
    doctorId: "BS002",
    patientId: "BN005",
    messages: [
      {
        sender: "patient",
        content:
          "Chào bác sĩ Hương, mấy hôm nay trời lạnh em ho nhiều và hơi khó thở.",
        createdAt: dm(45),
      },
      {
        sender: "doctor",
        content:
          "Anh Phúc giữ ấm ngực và cổ, dùng thuốc xịt đúng liều. Nếu SpO2 dưới 92% hoặc khó thở tăng thì báo tôi ngay hoặc đến phòng khám nhé.",
        createdAt: dm(30),
      },
    ],
    createdAt: dm(45),
    updatedAt: dm(30),
  },
  {
    id: "DM004",
    doctorId: "BS003",
    patientId: "BN008",
    messages: [
      {
        sender: "doctor",
        content: "Chào anh Thành, kết quả xét nghiệm của anh đã ổn. Anh còn triệu chứng gì không ạ?",
        createdAt: dm(20),
      },
    ],
    createdAt: dm(20),
    updatedAt: dm(20),
  },
  {
    id: "DM005",
    doctorId: "BS002",
    patientId: "BN006",
    messages: [
      {
        sender: "patient",
        content: "Chào bác sĩ, em uống thuốc xong thấy hơi chóng mặt, có sao không ạ?",
        createdAt: dm(75),
      },
      {
        sender: "doctor",
        content:
          "Chị nghỉ ngơi, uống đủ nước và tránh đứng dậy đột ngột nhé. Nếu chóng mặt kéo dài hoặc kèm mệt nhiều thì báo tôi ngay.",
        createdAt: dm(70),
      },
    ],
    createdAt: dm(75),
    updatedAt: dm(70),
  },
  {
    id: "DM006",
    doctorId: "BS001",
    patientId: "BN003",
    messages: [
      {
        sender: "doctor",
        content: "Chào anh Tuấn, vết thương đầu của anh tuần này thế nào, còn đau hay chóng mặt không ạ?",
        createdAt: dm(15),
      },
    ],
    createdAt: dm(15),
    updatedAt: dm(15),
  },
];

// ───────────────────── Hội thoại AI ↔ người dùng (chat co-pilot) ──────────
// `doctorId` = ID owner BẤT KỲ role (BS00X = bác sĩ, BN00X = bệnh nhân) — lý do
// lịch sử. CHỈ seed cho mã CỐ ĐỊNH của seed (BS001..3, BN001..10); register chỉ
// cấp mã mới từ BN011 trở đi nên các mã này không bao giờ bị tái dùng → không
// sinh hội thoại "ma". messages lưu RAW dạng {role, content} (StoredMessage).
type ConversationSeed = {
  id: string;
  title: string;
  doctorId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  createdAt: Date;
  updatedAt: Date;
};

function cm(minutesAgo: number): Date {
  return new Date(now.getTime() - minutesAgo * 60_000);
}

const conversationSeeds: ConversationSeed[] = [
  // ── AI ↔ bệnh nhân ──
  {
    id: "conv_seed_bn001",
    title: "Thuốc huyết áp uống lúc nào?",
    doctorId: "BN001",
    messages: [
      { role: "user", content: "Thuốc huyết áp tôi nên uống vào lúc nào trong ngày ạ?" },
      {
        role: "assistant",
        content:
          "Chào bác Hùng 👋 Amlodipine bác uống một lần vào buổi sáng, cố định cùng một giờ mỗi ngày để huyết áp ổn định. Bác nhớ không bỏ liều và hạn chế ăn mặn nhé.",
      },
    ],
    createdAt: cm(200),
    updatedAt: cm(200),
  },
  {
    id: "conv_seed_bn003",
    title: "Tiểu đường ăn trái cây được không?",
    doctorId: "BN003",
    messages: [
      { role: "user", content: "Tôi bị tiểu đường thì ăn trái cây ngọt có sao không?" },
      {
        role: "assistant",
        content:
          "Anh vẫn ăn trái cây được, nên chọn loại ít ngọt (ổi, bưởi, táo) với lượng vừa phải và tránh nước ép. Ăn sau bữa chính thay vì lúc đói sẽ giúp đường huyết ổn định hơn ạ.",
      },
    ],
    createdAt: cm(160),
    updatedAt: cm(160),
  },
  // ── AI ↔ bác sĩ ──
  {
    id: "conv_seed_bs001",
    title: "Hôm nay nên ưu tiên bệnh nhân nào?",
    doctorId: "BS001",
    messages: [
      { role: "user", content: "Hôm nay tôi nên ưu tiên theo dõi bệnh nhân nào trước?" },
      {
        role: "assistant",
        content:
          "Chào bác sĩ. Bệnh nhân Nguyễn Văn Hùng (BN001) sáng nay huyết áp 150/95 và NT-proBNP cao — nên ưu tiên xem trước. Bác có muốn tôi mở hồ sơ BN001 không ạ?",
      },
    ],
    createdAt: cm(120),
    updatedAt: cm(120),
  },
  {
    id: "conv_seed_bs002",
    title: "Tóm tắt tình trạng BN005",
    doctorId: "BS002",
    messages: [
      { role: "user", content: "Tóm tắt nhanh tình trạng bệnh nhân BN005 giúp tôi." },
      {
        role: "assistant",
        content:
          "Bệnh nhân BN005 có COPD, đợt lạnh này ho và khó thở tăng. Nên nhắc giữ ấm, dùng thuốc xịt đúng liều và theo dõi SpO2 — dưới 92% thì xử trí sớm. Bác có muốn tôi ghi chú nhắc tái khám không ạ?",
      },
    ],
    createdAt: cm(80),
    updatedAt: cm(80),
  },
];

// ───────────────────────────────────────────────────────── Runner
async function seed() {
  const db = await connectDB();

  // 1. Bệnh nhân
  const patients = db.collection<Patient>("patients");
  await patients.deleteMany({});
  // Bỏ index username unique cũ (seed đời trước) — BN nay không có username, nhiều
  // doc username=null sẽ vi phạm unique. dropIndex an toàn nếu index không tồn tại.
  await patients.dropIndex("username_1").catch(() => {});
  await patients.createIndex({ id: 1 }, { unique: true });
  // BN đăng nhập bằng SĐT → index phone (KHÔNG unique: BN do bác sĩ tạo có thể để trống).
  await patients.createIndex({ phone: 1 });
  const patientDocs = buildPatients();
  await patients.insertMany(patientDocs);

  // 2. Bác sĩ
  const doctors = db.collection<Doctor>("doctors");
  await doctors.deleteMany({});
  await doctors.createIndex({ id: 1 }, { unique: true });
  await doctors.createIndex({ username: 1 }, { unique: true });
  const doctorDocs = buildDoctors();
  await doctors.insertMany(doctorDocs);

  // 3. Quản lý
  const managers = db.collection<Manager>("managers");
  await managers.deleteMany({});
  await managers.createIndex({ id: 1 }, { unique: true });
  await managers.createIndex({ username: 1 }, { unique: true });
  await managers.insertOne(buildManager());

  // 4. Chuyên gia
  const experts = db.collection<Expert>("experts");
  await experts.deleteMany({});
  await experts.createIndex({ id: 1 }, { unique: true });
  await experts.createIndex({ username: 1 }, { unique: true });
  const expertDocs = buildExperts();
  await experts.insertMany(expertDocs);

  // 5. Lịch hẹn
  const appointments = db.collection<Appointment>("appointments");
  await appointments.deleteMany({});
  await appointments.createIndex({ id: 1 }, { unique: true });
  await appointments.createIndex({ doctorId: 1 });
  await appointments.createIndex({ patientId: 1 });
  await appointments.insertMany(appointmentSeeds);

  // 6. Tài sản
  const assets = db.collection<Asset>("assets");
  await assets.deleteMany({});
  await assets.createIndex({ id: 1 }, { unique: true });
  const assetDocs = buildAssets();
  await assets.insertMany(assetDocs);

  // Danh mục thuốc — bác sĩ chọn khi kê đơn (form chọn thuốc tab Hồ sơ).
  const medications = db.collection<Medication>("medications");
  await medications.deleteMany({});
  await medications.createIndex({ id: 1 }, { unique: true });
  await medications.createIndex({ name: 1 });
  const medicationDocs = buildMedications();
  await medications.insertMany(medicationDocs);

  // Danh mục xét nghiệm — bác sĩ chọn TÊN khi thêm kết quả (server tự suy đơn vị /
  // khoảng tham chiếu / cờ bất thường từ đây). Key = name (unique).
  const labCatalog = db.collection<LabCatalogEntry>("labcatalogs");
  await labCatalog.deleteMany({});
  await labCatalog.createIndex({ name: 1 }, { unique: true });
  await labCatalog.insertMany(labCatalogSeeds);

  // 7. Điện nước
  const utilities = db.collection<Utility>("utilities");
  await utilities.deleteMany({});
  await utilities.createIndex({ id: 1 }, { unique: true });
  const utilityDocs = buildUtilities();
  await utilities.insertMany(utilityDocs);

  // 8. Lương
  const payroll = db.collection<Payroll>("payroll");
  await payroll.deleteMany({});
  await payroll.createIndex({ id: 1 }, { unique: true });
  await payroll.createIndex({ employeeId: 1, period: 1 });
  const payrollDocs = buildPayroll();
  await payroll.insertMany(payrollDocs);

  // 9. Doanh thu
  const revenue = db.collection<Revenue>("revenue");
  await revenue.deleteMany({});
  await revenue.createIndex({ id: 1 }, { unique: true });
  await revenue.createIndex({ period: 1, source: 1 });
  const revenueDocs = buildRevenue();
  await revenue.insertMany(revenueDocs);

  // 10. Boots (AGENT.md theo vai trò) — agent đọc qua REST.
  const boots = db.collection<Boot>("boots");
  await boots.deleteMany({});
  await boots.createIndex({ role: 1 }, { unique: true });
  const bootDocs = buildBoots();
  await boots.insertMany(bootDocs);

  // 11. Skills (SKILL.md) — agent đọc qua REST; expert CRUD.
  const skills = db.collection<Skill>("skills");
  await skills.deleteMany({});
  await skills.createIndex({ name: 1 }, { unique: true });
  const skillDocs = buildSkills();
  await skills.insertMany(skillDocs);

  // 12. Workspaces (cá nhân hóa memory/soul/user theo từng user).
  const workspaces = db.collection<Workspace>("workspaces");
  await workspaces.deleteMany({});
  await workspaces.createIndex({ id: 1 }, { unique: true });
  const workspaceDocs = buildWorkspaces();
  await workspaces.insertMany(workspaceDocs);

  // 13. Tin nhắn trực tiếp 1-1 bác sĩ ↔ bệnh nhân.
  const directMessages = db.collection<DirectThread>("directmessages");
  await directMessages.deleteMany({});
  await directMessages.createIndex({ id: 1 }, { unique: true });
  await directMessages.createIndex(
    { doctorId: 1, patientId: 1 },
    { unique: true }
  );
  await directMessages.insertMany(directMessageSeeds);

  // 14. Conversations — XOÁ SẠCH rồi insert vài hội thoại mẫu cho MÃ CỐ ĐỊNH.
  // Bắt buộc dọn: register cấp mã BN bằng nextId (tái dùng BN011, BN012… sau mỗi
  // seed) → nếu còn rác, BN mới trùng mã thừa hưởng hội thoại "ma" (lọc theo
  // doctorId=ownerId). Hội thoại mẫu chỉ gắn vào BS001..3 / BN001..10 (mã không
  // bao giờ bị register tái dùng) nên an toàn.
  const conversations = db.collection("conversations");
  await conversations.deleteMany({});
  await conversations.insertMany(conversationSeeds);

  // Tổng kết
  console.log("✓ Seed hoàn tất — đã xoá sạch và insert lại:");
  console.log(`  patients     ${patientDocs.length}`);
  console.log(`  doctors      ${doctorDocs.length}`);
  console.log(`  managers     1`);
  console.log(`  experts      ${expertDocs.length}`);
  console.log(`  appointments ${appointmentSeeds.length}`);
  console.log(`  assets       ${assetDocs.length}`);
  console.log(`  medications  ${medicationDocs.length}`);
  console.log(`  labcatalogs  ${labCatalogSeeds.length}`);
  console.log(`  utilities    ${utilityDocs.length}`);
  console.log(`  payroll      ${payrollDocs.length}`);
  console.log(`  revenue      ${revenueDocs.length}`);
  console.log(`  boots        ${bootDocs.length}`);
  console.log(`  skills       ${skillDocs.length}`);
  console.log(`  workspaces   ${workspaceDocs.length}  (soul/user: BS001 + BN001)`);
  console.log(`  directmsgs   ${directMessageSeeds.length}`);
  console.log(`  conversations ${conversationSeeds.length}  (AI↔BN, AI↔BS mẫu)`);
  console.log("\nTài khoản:");
  console.log("  bs001..bs003 / mkbs001..003   (bác sĩ)");
  console.log("  ql001        / mkql001       (quản lý)");
  console.log("  cg001..cg003 / mkcg001..003  (chuyên gia)");
  console.log("  SĐT 0901234001..010 / mkbn001..010  (bệnh nhân — đăng nhập bằng SĐT)");

  await client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
