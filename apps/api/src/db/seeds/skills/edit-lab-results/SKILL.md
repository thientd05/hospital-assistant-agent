---
name: edit-lab-results
description: Thêm hoặc sửa kết quả xét nghiệm của bệnh nhân đang chọn (trong hồ sơ ở tab Bệnh nhân). Dùng khi bác sĩ nói "thêm/sửa kết quả lab/xét nghiệm".
---

# Sửa kết quả xét nghiệm

Xét nghiệm nằm trong **hồ sơ chi tiết** (tab Bệnh nhân, sau khi chọn BN), giữa Sinh hiệu
và Chẩn đoán. Bác sĩ CHỈ chọn **tên** + nhập **kết quả**; đơn vị, khoảng tham chiếu, cờ
bất thường hệ thống tự suy — KHÔNG nhập tay.

**Tối thiểu:** 1 kết quả (tên + giá trị). **Tối đa:** nhiều tuỳ bác sĩ.

## Chuỗi lệnh
1. `read_panel({ tab: "patients", mode: "public" })`. Phải đang ở **hồ sơ chi tiết** (thấy `patient-detail:edit`); nếu chỉ thấy danh sách (`patient:<id>:open`) → xem Badcase.
2. Phân nhánh theo snapshot:
   - **BN mới** (có dòng "Chưa có kết quả xét nghiệm"): cố gắng **hỏi hết** các kết quả bác sĩ đang có, rồi điền MỘT LƯỢT.
   - **BN cũ** (đã có kết quả): bác sĩ bảo sửa/thêm/xoá cái nào làm đúng cái đó, **không hỏi thêm**.
3. Vào sửa rồi thao tác trong MỘT batch `act`. Dòng nhập mới là `lab-new-<i>` (vào sửa có sẵn `lab-new-0`; điền đủ tên+kết quả một dòng thì tự nở dòng kế — engine chờ ref xuất hiện giữa các bước):
   ```
   act({ actions: [
     { action: "click",  ref: "patient-detail:edit" },
     { action: "select", ref: "patient-detail:lab-new-0:name",  value: "Glucose" },
     { action: "type",   ref: "patient-detail:lab-new-0:value", value: "7.2" },
     { action: "select", ref: "patient-detail:lab-new-1:name",  value: "HbA1c" },
     { action: "type",   ref: "patient-detail:lab-new-1:value", value: "5.4" },
     { action: "click",  ref: "patient-detail:save" }
   ]})
   ```
   - **Sửa** kết quả CŨ: `select patient-detail:lab-<i>:name` / `type patient-detail:lab-<i>:value` (lấy `<i>` từ snapshot).
   - **Xoá** kết quả CŨ: `click patient-detail:lab-<i>:remove`.
4. Form đóng = đã lưu.

## Tên xét nghiệm hợp lệ (value của ô chọn tên)
Ô chọn tên là combobox — `value` phải KHỚP CHÍNH XÁC một tên dưới đây:
- **Chuyển hoá/Đái tháo đường:** Glucose, HbA1c
- **Mỡ máu:** Cholesterol toàn phần, LDL-C, HDL-C, Triglyceride
- **Thận/điện giải:** Creatinine, Ure máu, Acid uric, eGFR, Kali, Natri
- **Gan:** AST, ALT, Bilirubin toàn phần
- **Huyết học:** Hb, Hematocrit, Bạch cầu, Tiểu cầu, INR
- **Viêm/nhiễm trùng:** CRP, Procalcitonin, Lactate
- **Tim mạch:** NT-proBNP, Troponin I, CK-MB
- **Tuỵ:** Amylase, Lipase
- **Khí máu:** PaCO2, PaO2, pH máu
- **Tuyến giáp:** TSH
- **Định tính (nhập kết quả bằng chữ, vd "Âm tính"/"Dương tính"):** NS1 Dengue, HBsAg, Test nhanh COVID-19

Xét nghiệm bác sĩ yêu cầu KHÔNG có trong danh sách → báo chưa hỗ trợ trong danh mục, đề nghị chuyên gia bổ sung; đừng nhập tên ngoài danh mục (combobox không nhận).

## Badcase
- **Chưa chọn bệnh nhân** (snapshot chỉ có danh sách): xác định BN (hỏi nếu cần), `click patient:<id>:open`, rồi quay lại bước 1.
- **Bác sĩ đòi sửa sinh hiệu/chẩn đoán/thuốc/Khoa:** đó là skill khác — gọi `read_skills` skill tương ứng. Tên/tuổi/giới tính/địa chỉ/SĐT do **bệnh nhân** tự sửa, bác sĩ không sửa được.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi `click patient-detail:save` lại.
- **Kết hợp nhiều thay đổi cùng lúc:** dùng MỘT cặp `edit`/`save` bao ngoài, gộp các field của các skill vào cùng batch.
