---
name: add-lab-result
description: Thêm một hoặc NHIỀU kết quả xét nghiệm cho bệnh nhân đang chọn trong một lần (tab Lab). Dùng khi bác sĩ nói "thêm kết quả lab/xét nghiệm".
---

# Thêm kết quả xét nghiệm

Bác sĩ CHỈ chọn **tên xét nghiệm** + nhập **kết quả**. Đơn vị, khoảng tham chiếu và
cờ bất thường do hệ thống tự suy từ danh mục — KHÔNG nhập tay, KHÔNG có ô cho chúng.

## Chuỗi lệnh
1. `read_panel({ tab: "lab" })`. Tab Lab cần đã chọn bệnh nhân — nếu snapshot không có `lab:add` (chỉ có thông báo "Chọn một bệnh nhân…"), xem Badcase.
2. Điền **TẤT CẢ** kết quả trong MỘT lần `act` duy nhất. Mỗi kết quả là một cụm 4 action `mở form → chọn tên → nhập kết quả → lưu`; nối các cụm lại trong cùng một mảng `actions`. Sau mỗi `lab-form:submit`, form đóng và `lab:add` hiện lại, nên cụm sau lại bắt đầu bằng `click lab:add` (engine tự chờ phần tử xuất hiện giữa các bước).
   ```
   act({ actions: [
     // --- kết quả 1 ---
     { action: "click",  ref: "lab:add" },
     { action: "select", ref: "lab-form:name",  value: "Glucose" },
     { action: "type",   ref: "lab-form:value", value: "7.2" },
     { action: "click",  ref: "lab-form:submit" },
     // --- kết quả 2 ---
     { action: "click",  ref: "lab:add" },
     { action: "select", ref: "lab-form:name",  value: "HbA1c" },
     { action: "type",   ref: "lab-form:value", value: "5.4" },
     { action: "click",  ref: "lab-form:submit" }
     // ... thêm cụm nữa cho mỗi kết quả còn lại
   ]})
   ```
   Mỗi cụm bắt buộc đúng 2 trường: `lab-form:name` (chọn) + `lab-form:value` (nhập). KHÔNG cần đơn vị, khoảng tham chiếu hay đánh dấu bất thường — hệ thống tự lo.
3. Form đóng sau cụm cuối = tất cả đã lưu.

## Tên xét nghiệm hợp lệ (value của `select lab-form:name`)
`lab-form:name` là ô CHỌN (combobox) — `value` phải KHỚP CHÍNH XÁC một tên dưới đây (kèm đơn vị tham khảo):
- **Chuyển hoá/Đái tháo đường:** Glucose (mmol/L), HbA1c (%)
- **Mỡ máu:** Cholesterol toàn phần, LDL-C, HDL-C, Triglyceride (mmol/L)
- **Thận/điện giải:** Creatinine (mg/dL), Ure máu (mmol/L), Acid uric (mg/dL), eGFR, Kali (mmol/L), Natri (mmol/L)
- **Gan:** AST, ALT (U/L), Bilirubin toàn phần (mg/dL)
- **Huyết học:** Hb (g/dL), Hematocrit (%), Bạch cầu, Tiểu cầu (K/uL), INR
- **Viêm/nhiễm trùng:** CRP (mg/L), Procalcitonin (ng/mL), Lactate (mmol/L)
- **Tim mạch:** NT-proBNP (pg/mL), Troponin I (ng/mL), CK-MB (U/L)
- **Tuỵ:** Amylase, Lipase (U/L)
- **Khí máu:** PaCO2, PaO2 (mmHg), pH máu
- **Tuyến giáp:** TSH (mIU/L)
- **Định tính (nhập kết quả bằng chữ, vd "Âm tính"/"Dương tính"):** NS1 Dengue, HBsAg, Test nhanh COVID-19

Nếu bác sĩ yêu cầu xét nghiệm KHÔNG có trong danh sách: báo lại là chưa hỗ trợ trong danh mục và hỏi tên gần đúng/đề nghị chuyên gia bổ sung; đừng cố nhập tên ngoài danh mục (select sẽ không nhận).

## Badcase
- **Chưa chọn bệnh nhân:** `read_panel({ tab: "patients" })`, xác định bệnh nhân (hỏi nếu cần), click `patient:<id>:open`, rồi quay lại bước 1.
- **Một cụm lỗi giữa batch:** `act` DỪNG ngay tại bước lỗi và trả `failedAt` + trace. Các cụm TRƯỚC đó đã submit thành công (đã lưu) — đừng làm lại chúng. Đọc `lab-form:error`, sửa cụm đang lỗi rồi gọi `act` mới chỉ cho các kết quả CÒN LẠI (kể từ cụm lỗi).
