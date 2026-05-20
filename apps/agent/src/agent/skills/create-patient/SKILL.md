---
name: create-patient
description: Tạo một bệnh nhân mới — mở form ở tab Bệnh nhân, điền, lưu, rồi mở hồ sơ vừa tạo. Dùng khi bác sĩ nói "tiếp nhận/thêm/tạo bệnh nhân mới".
---

# Tạo bệnh nhân

## Chuỗi lệnh
1. `open_panel({ tab: "patients" })`.
2. Gộp mở form + điền + lưu trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click",  ref: "patients:create" },
     { action: "type",   ref: "patient-form:name",   value: "<họ tên>" },
     { action: "type",   ref: "patient-form:age",    value: "<tuổi>" },
     { action: "select", ref: "patient-form:gender", value: "Nam" },
     { action: "type",   ref: "patient-form:ward",   value: "<khoa>" },
     { action: "click",  ref: "patient-form:submit" }
   ]})
   ```
   Bắt buộc: `name`, `age`, `ward`. Tuỳ chọn (chỉ khi bác sĩ cung cấp số đo): `medications`, `spO2`, `heartRate`, `bloodPressure`, `temperature`.
3. Submit thành công (form đóng) → trong snapshot tìm `patient:<id>:open` của bệnh nhân vừa tạo (label khớp tên, hoặc id BN lớn nhất) và `act` click nó để mở hồ sơ cho bác sĩ xem.

## Badcase
- **Thiếu field bắt buộc:** vẫn mở form và điền phần đã có, **ĐỪNG submit**; hỏi gọn field còn thiếu, khi có thì `act` để `type` field đó rồi click `patient-form:submit`.
- **Submit lỗi:** snapshot còn `patient-form:error` (alert) — đọc nội dung, sửa field tương ứng rồi submit lại.
- Không suy diễn sinh hiệu; bác sĩ nói "ổn định" KHÔNG phải con số.
- Chẩn đoán KHÔNG có ở form này — thêm sau bằng skill cập nhật hồ sơ.
