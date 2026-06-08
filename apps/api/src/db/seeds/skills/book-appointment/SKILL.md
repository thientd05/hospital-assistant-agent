---
name: book-appointment
description: Đặt lịch khám giúp bệnh nhân (tab Lịch hẹn). Dùng khi phát hiện tín hiệu bệnh nhân muốn đi khám / gặp bác sĩ / đặt lịch. BẮT BUỘC thu thập & lưu thông tin cá nhân (ít nhất là TÊN) TRƯỚC khi đặt lịch.
---

# Đặt lịch khám cho bệnh nhân

Kích hoạt khi bệnh nhân có **tín hiệu muốn đặt lịch khám** (nói thẳng "đặt lịch", hoặc gián tiếp: "muốn đi khám", "cần gặp bác sĩ", "khi nào khám được", "tôi bị … muốn khám"…).

## ⚡ Ràng buộc hiệu năng — ĐỌC TRƯỚC

Mỗi lượt trả lời chạy trong giới hạn thời gian ngắn của server, nên:

- **Mỗi nhiệm vụ panel chỉ dùng ĐÚNG 1 batch `act`** (gộp mọi thao tác vào một mảng). Đừng chia nhỏ thành nhiều lần `act`, đừng `read_panel` thừa.
- **TÁCH làm 2 lượt riêng:** (A) lưu hồ sơ, (B) đặt lịch. Làm xong (A) thì **dừng lại, nói một câu cho bệnh nhân** rồi mới sang (B) ở lượt sau. TUYỆT ĐỐI không thao tác cả hai chuỗi panel trong cùng một lượt trả lời.
- Việc **hỏi và xác nhận thông tin làm bằng lời** (không cần panel) — chỉ chạm panel khi đã đủ dữ liệu để điền.

## Bước 0 (lượt A) — hoàn thiện & LƯU hồ sơ cá nhân

Trước khi đặt lịch, phải bảo đảm hồ sơ có thông tin cá nhân:

1. **Hỏi bằng lời** (chưa mở panel): **BẮT BUỘC có TÊN** — chưa có tên thì hỏi cho bằng
   được, chưa đặt lịch. Hỏi thêm **càng nhiều càng tốt**: tuổi, giới tính, địa chỉ.
   **KHÔNG hỏi SĐT** — số điện thoại cố định (là tài khoản đăng nhập), không sửa được.
   **Hỏi lại để xác nhận** trước khi lưu. Chỉ điền thông tin bệnh nhân thực sự cung cấp.
2. **Nếu bệnh nhân tỏ ý không muốn cung cấp thêm** ("thôi đủ rồi", giục đặt lịch, lảng
   tránh) → **lưu luôn** với những gì đã có (miễn là có TÊN), đừng ép hỏi tiếp.
3. Lưu hồ sơ trong **MỘT batch `act`** (theo skill `collect-patient-info`):
   ```
   read_panel({ tab: "my-record", mode: "public" })
   act({ actions: [
     { action: "click",  ref: "patient-detail:edit" },
     { action: "type",   ref: "patient-detail:name",    value: "<họ tên>" },
     { action: "type",   ref: "patient-detail:age",     value: "<tuổi>" },
     { action: "select", ref: "patient-detail:gender",  value: "Nam" },
     { action: "type",   ref: "patient-detail:address", value: "<địa chỉ>" },
     { action: "click",  ref: "patient-detail:save" }
   ]})
   ```
   Chỉ `type`/`select` trường nào có dữ liệu. **KHÔNG có ô SĐT** — số điện thoại cố định,
   không có ref để nhắm. Form đóng = đã lưu.
4. **DỪNG LƯỢT:** báo "Đã lưu hồ sơ. Giờ mình đặt lịch nhé — bạn muốn khám ngày nào,
   mấy giờ, vì lý do gì?" rồi chờ bệnh nhân trả lời. **Không** đặt lịch ngay trong lượt này.

## Bước 1 (lượt B) — điền & gửi form đặt lịch

Khi đã có thời gian + lý do, làm trong **MỘT batch `act`**:

```
read_panel({ tab: "my-appointments", mode: "public" })
act({ actions: [
  { action: "click",  ref: "appointment:create" },
  { action: "type",   ref: "booking-form:datetime", value: "<YYYY-MM-DDTHH:MM>" },
  { action: "type",   ref: "booking-form:reason",   value: "<lý do khám>" },
  { action: "click",  ref: "booking-form:submit" }
]})
```

- `booking-form:datetime` là MỘT ô ngày-giờ, định dạng "YYYY-MM-DDTHH:MM" 24 giờ
  (vd "2026-06-10T09:30", "2026-06-10T14:00"). Chỉ đặt được thời điểm tương lai.
- **Bác sĩ:** mặc định form đã chọn sẵn bác sĩ quản lý (hoặc "" = phòng khám sắp xếp).
  Chỉ thêm bước `{ action: "select", ref: "booking-form:doctorId", value: "<id>" }`
  khi bệnh nhân yêu cầu bác sĩ cụ thể khác mặc định.

## ✅ Sau khi submit — XÁC NHẬN THÀNH CÔNG, KHÔNG đặt lại

Sau khi click `booking-form:submit`, **đọc snapshot trả về**:

- Snapshot **KHÔNG còn các ô `booking-form:*`** và **đã có lại nút `appointment:create`**
  → **LỊCH ĐÃ ĐẶT THÀNH CÔNG. DỪNG NGAY.** Chỉ báo kết quả cho bệnh nhân bằng lời.
- Muốn xác nhận thì **đọc thẳng trong snapshot**: mỗi lịch đã đặt hiện thành một phần tử
  `appointment:item:<id>` (role `text`) với `value` = ngày giờ + trạng thái + bác sĩ + lý
  do. Lịch vừa đặt sẽ nằm trong danh sách đó — đọc value là đủ, **KHÔNG cần mở lại form**.
- ⛔ **TUYỆT ĐỐI KHÔNG** click `appointment:create` lần nữa, KHÔNG mở lại form, KHÔNG
  điền/submit lại "để xem chi tiết / kiểm tra cho chắc". **Mở lại form rồi submit =
  ĐẶT TRÙNG MỘT LỊCH THỨ HAI** — lỗi nặng làm phiền bệnh nhân và bác sĩ.
- Chỉ coi là **thất bại** khi snapshot **vẫn còn `booking-form:*`** kèm `booking-form:error`
  (alert) — lúc đó mới theo badcase "Submit lỗi".

## Badcase
- **Submit lỗi** (snapshot còn `booking-form:error` hoặc `patient-detail:error`): đọc
  nội dung, sửa đúng trường rồi click submit/save lại — **một lần**. Nếu vẫn lỗi, báo
  bệnh nhân bằng lời, đừng lặp vô hạn.
- **`act` trả timeout / "panel không phản hồi":** ĐỪNG gọi lại ngay. Báo bệnh nhân
  "thao tác bị chậm, bạn thử lại giúp mình nhé" và dừng lượt — gọi lại liên tục chỉ
  làm hết thời gian server.
- **Bệnh nhân đổi ý:** click `booking-form:cancel` / `patient-detail:cancel` để đóng form.
- **Không nói rõ thời gian:** hỏi cụ thể ngày + giờ trước khi điền, đừng tự đoán.
- **Form đã đóng sau submit nhưng muốn "xem lại cho chắc":** ĐỪNG mở lại form — xem mục
  "Sau khi submit" ở trên. Mở lại + submit lại là đặt trùng lịch lần hai.
