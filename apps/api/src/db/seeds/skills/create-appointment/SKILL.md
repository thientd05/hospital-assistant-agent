---
name: create-appointment
description: Tạo một lịch hẹn cho bệnh nhân (tab Lịch hẹn). Dùng khi bác sĩ nói "đặt/tạo lịch hẹn".
---

# Tạo lịch hẹn

## Chuỗi lệnh
1. `open_panel({ tab: "appointments" })`.
2. Gộp trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click", ref: "appointment:create" },
     { action: "type",  ref: "appointment-form:patientId", value: "BN001" },
     { action: "type",  ref: "appointment-form:day",       value: "15" },
     { action: "type",  ref: "appointment-form:month",     value: "6" },
     { action: "type",  ref: "appointment-form:year",      value: "2026" },
     { action: "type",  ref: "appointment-form:time",      value: "09:30" },
     { action: "type",  ref: "appointment-form:reason",    value: "<lý do>" },
     { action: "click", ref: "appointment-form:submit" }
   ]})
   ```
   Tất cả field bắt buộc. `time` định dạng HH:MM (24h).
3. Form đóng = đã tạo.

## Badcase
- **Thiếu mã BN/ngày/giờ/lý do:** điền phần đã có, ĐỪNG submit; hỏi field thiếu rồi `type` + submit.
- **Chỉ có tên, chưa có mã BN:** `open_panel({ tab: "patients" })`, tìm bệnh nhân trong snapshot để lấy `<id>` từ ref `patient:<id>:open`, rồi quay lại.
- **Ngày/giờ không hợp lệ hoặc BN không tồn tại:** đọc `appointment-form:error` (alert), sửa rồi submit lại.
