import type { LabCatalogEntry } from "@pr_hospitalagent/types";

// NGUỒN SEED cho collection `labcatalogs`. Runtime đọc danh mục từ Mongo (GET
// /api/lab-catalog); đây chỉ là dữ liệu khởi tạo. Thêm/bớt loại xét nghiệm: sửa
// mảng này rồi chạy lại seed (hoặc ghi thẳng Mongo).
//
// Hai loại entry:
//  - Định lượng: có `low`/`high` (một hoặc cả hai). isAbnormal khi giá trị ngoài [low, high].
//  - Định tính: có `normal` (vd "Âm tính"). isAbnormal khi kết quả khác `normal`.
export const labCatalogSeeds: LabCatalogEntry[] = [
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
