---
name: edit-vitals
description: Cập nhật sinh hiệu (SpO2, nhịp tim, huyết áp, nhiệt độ) của bệnh nhân đang chọn. Dùng khi bác sĩ nói "cập nhật/ghi sinh hiệu".
---

# Sửa sinh hiệu

Sinh hiệu nằm trong **hồ sơ chi tiết** (tab Bệnh nhân, sau khi chọn BN). 4 trường:
`patient-detail:spO2`, `:heartRate`, `:bloodPressure`, `:temperature` (đều textbox).

**Tối thiểu:** 1/4 trường. **Tối đa:** 4/4.

## Chuỗi lệnh
1. `read_panel({ tab: "patients" })`. Phải đang ở hồ sơ chi tiết (thấy `patient-detail:edit`); nếu chỉ thấy danh sách → xem Badcase.
2. Phân nhánh theo snapshot:
   - **BN mới** (cả 4 sinh hiệu trống — value rỗng/placeholder "0"): cố gắng **hỏi đủ 4** rồi cập nhật một thể.
   - **BN cũ**: cập nhật đúng 1 hay nhiều trường bác sĩ nêu, **KHÔNG hỏi "cần sửa thêm sinh hiệu nào không"**.
3. Vào sửa rồi đổi đúng trường cần đổi trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click", ref: "patient-detail:edit" },
     { action: "type",  ref: "patient-detail:spO2",          value: "96" },
     { action: "type",  ref: "patient-detail:heartRate",     value: "80" },
     { action: "type",  ref: "patient-detail:bloodPressure", value: "120/80" },
     { action: "type",  ref: "patient-detail:temperature",   value: "37" },
     { action: "click", ref: "patient-detail:save" }
   ]})
   ```
   - Huyết áp dạng "tâm thu/tâm trương" (vd "120/80"); SpO2/nhịp tim/nhiệt độ là số.
   - Chỉ `type` trường bác sĩ yêu cầu; bỏ qua trường không đổi.
4. Form đóng = đã lưu.

## Badcase
- **Chưa chọn bệnh nhân:** `click patient:<id>:open` rồi quay lại bước 1.
- **Bác sĩ đòi sửa xét nghiệm/chẩn đoán/thuốc/Khoa:** đó là skill khác — gọi `read_skills` skill tương ứng.
- **Giá trị không phải số** (trừ huyết áp): hỏi lại con số cụ thể trước khi điền.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi `click patient-detail:save` lại.
- **Kết hợp nhiều thay đổi cùng lúc:** dùng MỘT cặp `edit`/`save` bao ngoài, gộp các field của các skill vào cùng batch.
