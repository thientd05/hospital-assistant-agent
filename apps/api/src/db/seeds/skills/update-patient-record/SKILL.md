---
name: update-patient-record
description: Cập nhật hồ sơ bệnh nhân đang chọn — chẩn đoán, thuốc, sinh hiệu, thông tin cơ bản (tab Hồ sơ, chế độ Sửa). Dùng khi bác sĩ nói "thêm chẩn đoán/cập nhật hồ sơ/sửa thông tin/cập nhật sinh hiệu".
---

# Cập nhật hồ sơ bệnh nhân

## Chuỗi lệnh
1. `open_panel({ tab: "patient" })`. Cần đã chọn bệnh nhân — nếu chưa, xem Badcase.
2. Vào chế độ sửa rồi đổi đúng field cần đổi trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click", ref: "patient-detail:edit" },
     { action: "type",  ref: "patient-detail:diagnoses", value: "tăng huyết áp, đái tháo đường type 2" },
     { action: "click", ref: "patient-detail:save" }
   ]})
   ```
   Chỉ `type` các field cần đổi: `name`, `age`, `ward`, `address` (địa chỉ), `phone` (số điện thoại) (text), `gender` (select), `spO2`/`heartRate`/`bloodPressure`/`temperature` (sinh hiệu), `diagnoses`/`medications` (danh sách, cách nhau dấu phẩy).
3. Form đóng = đã lưu.

## Badcase
- **Chưa chọn bệnh nhân:** `open_panel({ tab: "patients" })`, click `patient:<id>:open`, rồi quay lại bước 1.
- **THÊM (không thay) chẩn đoán/thuốc:** action `type` GHI ĐÈ toàn bộ field. Muốn nối vào danh sách cũ: sau khi click `patient-detail:edit`, đọc `value` hiện có của field trong snapshot, ghép `"giá trị cũ, giá trị mới"`, rồi `type` chuỗi đầy đủ đó.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi click `patient-detail:save` lại.
