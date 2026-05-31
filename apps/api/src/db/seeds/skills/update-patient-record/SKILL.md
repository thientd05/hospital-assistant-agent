---
name: update-patient-record
description: Cập nhật phần lâm sàng của hồ sơ bệnh nhân đang chọn — Khoa, chẩn đoán, thuốc, sinh hiệu (tab Hồ sơ, chế độ Sửa). Dùng khi bác sĩ nói "thêm chẩn đoán/kê thuốc/cập nhật sinh hiệu/phân khoa".
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
   Chỉ `type` các field cần đổi: `ward` (Khoa, text), `spO2`/`heartRate`/`bloodPressure`/`temperature` (sinh hiệu), `diagnoses`/`medications` (danh sách, cách nhau dấu phẩy). KHÔNG có ô nào khác — đó là tất cả những gì bác sĩ sửa được.
3. Form đóng = đã lưu.

## Badcase
- **Chưa chọn bệnh nhân:** `open_panel({ tab: "patients" })`, click `patient:<id>:open`, rồi quay lại bước 1.
- **THÊM (không thay) chẩn đoán/thuốc:** action `type` GHI ĐÈ toàn bộ field. Muốn nối vào danh sách cũ: sau khi click `patient-detail:edit`, đọc `value` hiện có của field trong snapshot, ghép `"giá trị cũ, giá trị mới"`, rồi `type` chuỗi đầy đủ đó.
- **Bác sĩ muốn sửa tên/tuổi/giới tính/địa chỉ/SĐT:** KHÔNG sửa được — đó là thông tin cá nhân do **chính bệnh nhân** tự cập nhật (qua tài khoản của họ). Snapshot ở chế độ sửa không có ô nào cho các trường này. Giải thích cho bác sĩ và đề nghị nhắc bệnh nhân tự sửa. Mã BN cũng không ai sửa được.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi click `patient-detail:save` lại.
