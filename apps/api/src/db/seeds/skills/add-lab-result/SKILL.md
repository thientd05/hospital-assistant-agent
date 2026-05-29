---
name: add-lab-result
description: Thêm một hoặc NHIỀU kết quả xét nghiệm cho bệnh nhân đang chọn trong một lần (tab Lab). Dùng khi bác sĩ nói "thêm kết quả lab/xét nghiệm".
---

# Thêm kết quả xét nghiệm

## Chuỗi lệnh
1. `open_panel({ tab: "lab" })`. Tab Lab cần đã chọn bệnh nhân — nếu snapshot không có `lab:add` (chỉ có thông báo "Chọn một bệnh nhân…"), xem Badcase.
2. Điền **TẤT CẢ** kết quả trong MỘT lần `act` duy nhất. Mỗi kết quả là một cụm 6–7 action `mở form → điền → lưu`; nối các cụm lại trong cùng một mảng `actions`. Sau mỗi `lab-form:submit`, form đóng và `lab:add` hiện lại, nên cụm sau lại bắt đầu bằng `click lab:add` (engine tự chờ phần tử xuất hiện giữa các bước).
   ```
   act({ actions: [
     // --- kết quả 1 ---
     { action: "click", ref: "lab:add" },
     { action: "type",  ref: "lab-form:name",           value: "Glucose" },
     { action: "type",  ref: "lab-form:value",          value: "7.2" },
     { action: "type",  ref: "lab-form:unit",           value: "mmol/L" },
     { action: "type",  ref: "lab-form:referenceRange", value: "3.9-5.6" },
     { action: "check", ref: "lab-form:isAbnormal",     value: "true" },
     { action: "click", ref: "lab-form:submit" },
     // --- kết quả 2 ---
     { action: "click", ref: "lab:add" },
     { action: "type",  ref: "lab-form:name",           value: "HbA1c" },
     { action: "type",  ref: "lab-form:value",          value: "5.4" },
     { action: "type",  ref: "lab-form:unit",           value: "%" },
     { action: "type",  ref: "lab-form:referenceRange", value: "4.0-5.6" },
     { action: "click", ref: "lab-form:submit" }
     // ... thêm cụm nữa cho mỗi kết quả còn lại
   ]})
   ```
   Mỗi cụm bắt buộc: `name`, `value`, `unit`, `referenceRange`. Chỉ chèn `check lab-form:isAbnormal` trong cụm có kết quả bất thường (bỏ qua nếu bình thường). Chỉ một kết quả thì batch chỉ có một cụm.
3. Form đóng sau cụm cuối = tất cả đã lưu.

## Badcase
- **Chưa chọn bệnh nhân:** `open_panel({ tab: "patients" })`, xác định bệnh nhân (hỏi nếu cần), click `patient:<id>:open`, rồi quay lại bước 1.
- **Một cụm lỗi giữa batch:** `act` DỪNG ngay tại bước lỗi và trả `failedAt` + trace. Các cụm TRƯỚC đó đã submit thành công (đã lưu) — đừng làm lại chúng. Đọc `lab-form:error`, sửa cụm đang lỗi rồi gọi `act` mới chỉ cho các kết quả CÒN LẠI (kể từ cụm lỗi).
