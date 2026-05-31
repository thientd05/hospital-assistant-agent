---
name: book-appointment
description: Đặt lịch khám giúp bệnh nhân (tab Lịch hẹn). Dùng khi phát hiện tín hiệu bệnh nhân muốn đi khám / gặp bác sĩ / đặt lịch. BẮT BUỘC thu thập & lưu thông tin cá nhân (ít nhất là TÊN) TRƯỚC khi đặt lịch.
---

# Đặt lịch khám cho bệnh nhân

Kích hoạt khi bệnh nhân có **tín hiệu muốn đặt lịch khám** (nói thẳng "đặt lịch", hoặc gián tiếp: "muốn đi khám", "cần gặp bác sĩ", "khi nào khám được", "tôi bị … muốn khám"…).

## Bước 0 (BẮT BUỘC TRƯỚC TIÊN) — hoàn thiện hồ sơ cá nhân

Trước khi mở form đặt lịch, phải bảo đảm hồ sơ có thông tin cá nhân:

1. Mở `open_panel({ tab: "my-record" })`, đọc snapshot xem trường nào đã có / còn trống.
2. **BẮT BUỘC có TÊN.** Nếu chưa có tên → hỏi cho bằng được, chưa đặt lịch khi chưa có tên.
3. Hỏi thêm **càng nhiều càng tốt**: tuổi, giới tính, địa chỉ, số điện thoại. Hỏi lại để
   **xác nhận** trước khi lưu. Chỉ điền thông tin bệnh nhân thực sự cung cấp.
4. Điền & lưu hồ sơ theo skill `collect-patient-info` (chỉ 5 trường: name/age/gender/
   address/phone, trong MỘT batch `act`, kết thúc bằng `patient-detail:save`).
5. **Nếu bệnh nhân tỏ ý không muốn cung cấp thêm** ("thôi đủ rồi", giục đặt lịch, lảng
   tránh) → **tự lưu form hồ sơ luôn** với những gì đã có (miễn là đã có TÊN), đừng ép hỏi tiếp.

## Bước 1 — hỏi thông tin đặt lịch

Hỏi bệnh nhân:
- **Thời gian mong muốn** (ngày/tháng/năm + giờ).
- **Lý do khám** (bắt buộc — vd "đau họng, ho 3 ngày").
- **Bác sĩ**: nếu họ đã có bác sĩ quản lý, mặc định chọn bác sĩ đó; nếu chưa hoặc không
  có yêu cầu cụ thể, để trống ("" = "Để phòng khám sắp xếp", ai duyệt trước nhận).

## Bước 2 — điền & gửi form đặt lịch

```
open_panel({ tab: "my-appointments" })
act({ actions: [
  { action: "click",  ref: "appointment:create" },
  { action: "select", ref: "booking-form:doctorId", value: "<id bác sĩ hoặc bỏ qua để dùng mặc định>" },
  { action: "type",   ref: "booking-form:day",    value: "<DD>" },
  { action: "type",   ref: "booking-form:month",  value: "<MM>" },
  { action: "type",   ref: "booking-form:year",   value: "<YYYY>" },
  { action: "type",   ref: "booking-form:time",   value: "<HH:MM>" },
  { action: "type",   ref: "booking-form:reason", value: "<lý do khám>" },
  { action: "click",  ref: "booking-form:submit" }
]})
```

- `booking-form:time` định dạng "HH:MM" 24 giờ (vd "09:30", "14:00").
- Bỏ qua bước `select doctorId` nếu muốn giữ mặc định (bác sĩ quản lý, hoặc "" khi chưa có).
- Form đóng = đã đặt lịch thành công.

## Badcase
- **Submit lỗi** (snapshot còn `booking-form:error`): đọc nội dung. Thường gặp:
  thiếu thời gian/lý do, hoặc ngày tháng không hợp lệ/không tồn tại → hỏi lại bệnh nhân
  con số đúng rồi sửa trường tương ứng và click `booking-form:submit` lại.
- **Bệnh nhân đổi ý giữa chừng:** click `booking-form:cancel` để đóng form.
- **Không nói rõ thời gian:** hỏi cụ thể ngày + giờ trước khi điền, đừng tự đoán.
