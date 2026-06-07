---
name: view-exam-history
description: Xem lại LỊCH SỬ KHÁM / diễn tiến / quá trình điều trị của bệnh nhân và hiện DASHBOARD trực quan. Dùng khi bác sĩ nói "xem lịch sử khám", "diễn tiến bệnh", "các lần khám trước", "quá trình điều trị", "huyết áp thay đổi thế nào". SKILL này RẤT QUAN TRỌNG, CẤM bỏ qua khi bác sĩ hỏi những câu trên.
---

# Dashboard lịch sử khám

Để hiện dashboard lịch sử khám trực quan, bạn **KHÔNG tự vẽ HTML/SVG**. Giao diện đã có sẵn ở app — bạn chỉ cần **phát data**, app tự dựng dashboard (header + tab Tổng quan/Đồ thị/Timeline + biểu đồ sinh hiệu & xét nghiệm) và tự vẽ dần.

## Chuỗi lệnh
1. `read_panel({ tab: "patients" })` → tìm **mã bệnh nhân đang chọn** + **tên** (hồ sơ chi tiết / ref `patient:<id>:open`). Chưa chọn BN → bảo bác sĩ chọn một bệnh nhân ở tab Bệnh nhân trước (xem Badcase).
2. Xuất **ĐÚNG MỘT** khối ```` ```exam-dashboard ```` chứa **JSON một dòng** `{"patientId":"<mã>","patientName":"<tên>"}`. App nhận id này, tự lấy lịch sử khám và dựng dashboard.
3. Kèm **đúng 1 câu** dẫn nhập trước/sau khối (vd "Đây là tổng quan các lần khám của bác …"). KHÔNG mô tả lại nội dung bằng chữ, KHÔNG kẻ bảng markdown — dashboard tự nói.

Ví dụ khối phát ra:
````
```exam-dashboard
{"patientId":"BN001","patientName":"Nguyễn Văn Hùng"}
```
````

## Khi nào dùng `read_exam_history`
Chỉ khi bác sĩ hỏi **một con số/chi tiết cụ thể** (vd "lần trước huyết áp bao nhiêu") → gọi `read_exam_history({ patientId })` rồi trả lời thẳng bằng chữ, **không** cần phát dashboard.

## Badcase
- **Chưa chọn bệnh nhân:** đọc panel không thấy hồ sơ chi tiết → bảo bác sĩ chọn một bệnh nhân ở tab Bệnh nhân trước, rồi thử lại. KHÔNG đoán mã.
- **Không có lịch sử:** cứ phát khối `exam-dashboard` — app tự báo "chưa có lịch sử khám" gọn gàng, bạn không phải xử lý.
