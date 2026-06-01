---
name: update-patient-record
description: Cập nhật phần lâm sàng của hồ sơ bệnh nhân đang chọn — Khoa, chẩn đoán, thuốc, sinh hiệu (tab Hồ sơ, chế độ Sửa). Dùng khi bác sĩ nói "thêm chẩn đoán/kê thuốc/cập nhật sinh hiệu/phân khoa".
---

# Cập nhật hồ sơ bệnh nhân

## Chuỗi lệnh
1. `read_panel({ tab: "patient" })`. Cần đã chọn bệnh nhân — nếu chưa, xem Badcase.
2. Vào chế độ sửa rồi đổi đúng field cần đổi trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click",  ref: "patient-detail:edit" },
     { action: "type",   ref: "patient-detail:diagnoses", value: "tăng huyết áp, đái tháo đường type 2" },
     { action: "select", ref: "patient-detail:ward", value: "Nội Tim mạch" },
     { action: "click",  ref: "patient-detail:save" }
   ]})
   ```
   - `ward` (Khoa) là **combobox** → `select`, giá trị khớp một option (vd "Nội Tim mạch"; "" = "Chưa phân khoa").
   - `diagnoses` (danh sách, cách nhau dấu phẩy) và `spO2`/`heartRate`/`bloodPressure`/`temperature` (sinh hiệu) → `type`.
   - **Thuốc KHÔNG còn ô gõ tay** — kê qua form chọn thuốc (xem mục dưới), KHÔNG có `patient-detail:medications`.
3. Form đóng = đã lưu.

## Kê thuốc (form chọn thuốc)
Thuốc chọn từ **danh mục** (không gõ tự do). Mỗi thuốc là một **checkbox** (`role: "checkbox"`), `label` = tên thuốc, `checked` cho biết đang kê hay chưa.
1. Sau khi vào chế độ sửa, mở form: `act({ actions: [ { action: "click", ref: "patient-detail:edit" }, { action: "click", ref: "patient-detail:medications-open" } ] })`.
2. Đọc snapshot trả về: tìm các `med-picker:med:<id>` có `label` khớp thuốc cần kê (có thể `type` vào `med-picker:search` để lọc danh sách trước cho gọn).
3. Bật/tắt từng thuốc bằng `check` (idempotent — KHÔNG click mù), rồi lưu form rồi lưu hồ sơ:
   ```
   act({ actions: [
     { action: "check", ref: "med-picker:med:TH007", value: "true" },
     { action: "check", ref: "med-picker:med:TH025", value: "true" },
     { action: "click", ref: "med-picker:save" },
     { action: "click", ref: "patient-detail:save" }
   ]})
   ```
   Bỏ một thuốc đang kê: `check` với `value: "false"`.

## Badcase
- **Chưa chọn bệnh nhân:** `read_panel({ tab: "patients" })`, click `patient:<id>:open`, rồi quay lại bước 1.
- **THÊM (không thay) thuốc:** vì là checkbox, thuốc đang kê đã `checked` sẵn khi mở form — chỉ cần `check` thêm thuốc mới (`true`), KHÔNG đụng thuốc cũ. (Khác `diagnoses` dùng `type` sẽ GHI ĐÈ: muốn nối thì đọc `value` cũ trong snapshot rồi ghép `"cũ, mới"` trước khi `type`.)
- **Không thấy thuốc trong danh mục:** danh mục cố định — nếu thuốc bác sĩ muốn không có, báo lại cho bác sĩ (không kê được thuốc ngoài danh mục).
- **Bác sĩ muốn sửa tên/tuổi/giới tính/địa chỉ/SĐT:** KHÔNG sửa được — đó là thông tin cá nhân do **chính bệnh nhân** tự cập nhật. Mã BN cũng không ai sửa được.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi click `patient-detail:save` lại.
