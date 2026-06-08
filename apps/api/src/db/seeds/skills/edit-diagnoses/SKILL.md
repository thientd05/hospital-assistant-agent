---
name: edit-diagnoses
description: Cập nhật chẩn đoán của bệnh nhân đang chọn. Dùng khi bác sĩ nói "thêm/sửa/ghi chẩn đoán".
---

# Sửa chẩn đoán

Chẩn đoán nằm trong **hồ sơ chi tiết** (tab Bệnh nhân, sau khi chọn BN): một ô
`patient-detail:diagnoses` (textbox), **mỗi chẩn đoán một dòng** (ngăn bằng `\n`).

**Tối thiểu:** 1 chẩn đoán khi đặt từ trống.

## Chuỗi lệnh
1. `read_panel({ tab: "patients", mode: "public" })`. Phải đang ở hồ sơ chi tiết (thấy `patient-detail:edit`); nếu chỉ thấy danh sách → xem Badcase.
2. Phân nhánh theo snapshot:
   - **Chưa có chẩn đoán** ("Chưa có chẩn đoán"): **hỏi tiếp đến khi bác sĩ chốt** danh sách rồi mới điền.
   - **Đã có chẩn đoán**: bác sĩ nói gì làm đấy, **không hỏi thêm**.
3. Vào sửa rồi điền trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click", ref: "patient-detail:edit" },
     { action: "type",  ref: "patient-detail:diagnoses", value: "tăng huyết áp\nđái tháo đường type 2" },
     { action: "click", ref: "patient-detail:save" }
   ]})
   ```
   - `type` **GHI ĐÈ** toàn bộ ô. Muốn **nối thêm** vào chẩn đoán cũ: đọc `value` cũ trong snapshot rồi ghép `"cũ\nmới"` (mỗi chẩn đoán một dòng) trước khi `type`.
4. Form đóng = đã lưu.

## Badcase
- **Chưa chọn bệnh nhân:** `click patient:<id>:open` rồi quay lại bước 1.
- **Bác sĩ đòi sửa sinh hiệu/xét nghiệm/thuốc/Khoa:** đó là skill khác — gọi `read_skills` skill tương ứng.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi `click patient-detail:save` lại.
- **Kết hợp nhiều thay đổi cùng lúc:** dùng MỘT cặp `edit`/`save` bao ngoài, gộp các field của các skill vào cùng batch.
