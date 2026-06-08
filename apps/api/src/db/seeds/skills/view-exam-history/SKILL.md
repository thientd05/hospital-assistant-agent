---
name: view-exam-history
description: Xem lại LỊCH SỬ KHÁM / diễn tiến / quá trình điều trị của bệnh nhân và hiện DASHBOARD trực quan. Dùng khi bác sĩ nói "xem lịch sử khám", "diễn tiến bệnh", "các lần khám trước", "quá trình điều trị", "huyết áp thay đổi thế nào". SKILL này RẤT QUAN TRỌNG, CẤM bỏ qua khi bác sĩ hỏi những câu trên.
---

# Dashboard lịch sử khám

Để hiện dashboard lịch sử khám trực quan, bạn **KHÔNG tự vẽ HTML/SVG**. Giao diện đã có sẵn ở app — bạn chỉ cần **phát data**, app tự dựng dashboard (header + tab Tổng quan/Đồ thị/Timeline + biểu đồ sinh hiệu & xét nghiệm) và tự vẽ dần.

## Chuỗi lệnh
1. `read_panel({ tab: "patients", mode: "silent" })` 
Bạn sẽ thấy **Mã bệnh nhân** khớp với Tên bệnh nhân mà bác sĩ hỏi ngay ở danh sách bệnh nhân.
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
- **Chưa có bệnh nhân nào:**khả năng cao do panel load chậm, hãy chờ 1 giây và đọc lại lần 2, tối đa lần 3, nếu đọc lại 3 lần mà vẫn không có thì thông báo bác sĩ chưa có bệnh nhân nào để bác sĩ kiểm tra lại.
- **Chưa chọn bệnh nhân:** đọc panel không thấy bệnh nhân nào khớp, thì khả năng cao do bác sĩ nhớ nhầm tên, hãy hỏi lại.
- **Có nhiều bệnh nhân trùng tên**: hãy hỏi bác sĩ để bác sĩ cung cấp thêm thông tin phân biệt, sau đó bạn có thể tìm kiếm hoặc tự đối chiếu lại kết quả từng xem được từ lúc trước.
- **Không có lịch sử:** cứ phát khối `exam-dashboard` — app tự báo "chưa có lịch sử khám" gọn gàng, bạn không phải xử lý.
