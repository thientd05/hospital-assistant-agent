---
name: assign-ward
description: Gán hoặc đổi Khoa (phân khoa) cho bệnh nhân đang chọn. Dùng khi bác sĩ nói "chuyển khoa/phân khoa/đổi khoa".
---

# Phân khoa

Khoa nằm trong **hồ sơ chi tiết** (tab Bệnh nhân): ô `patient-detail:ward` (combobox).

**Tối thiểu:** 1 trường (Khoa).

## Chuỗi lệnh
1. `read_panel({ tab: "patients", mode: "public" })`. Phải đang ở hồ sơ chi tiết (thấy `patient-detail:edit`); nếu chỉ thấy danh sách → xem Badcase.
2. Vào sửa, chọn Khoa, lưu — MỘT batch `act`:
   ```
   act([
     { action: "click",  ref: "patient-detail:edit" },
     { action: "select", ref: "patient-detail:ward", value: "Nội Tim mạch" },
     { action: "click",  ref: "patient-detail:save" }
   ])
   ```
3. Form đóng = đã lưu.

## Khoa hợp lệ (value của combobox)
`""` = "— Chưa phân khoa —", hoặc một trong: Nội Tim mạch, Nội Tổng quát, Nội Thận,
Hô hấp, Tiêu hóa, Thần kinh, Truyền nhiễm, Cấp cứu, Sản, Nhi.

## Badcase
- **Chưa chọn bệnh nhân:** `click patient:<id>:open` rồi quay lại bước 1.
- **Khoa bác sĩ nêu ngoài danh mục:** báo bác sĩ danh sách khoa hợp lệ, không tự thêm khoa lạ.
- **Bác sĩ đòi sửa sinh hiệu/xét nghiệm/chẩn đoán/thuốc:** đó là skill khác — gọi `read_skills` skill tương ứng.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi `click patient-detail:save` lại.
- **Kết hợp nhiều thay đổi cùng lúc:** dùng MỘT cặp `edit`/`save` bao ngoài, gộp các field của các skill vào cùng batch.
