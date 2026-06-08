---
name: view-my-appointments
description: Xem/trình bày các lịch hẹn của CHÍNH bệnh nhân dưới dạng hình trực quan. Dùng khi bệnh nhân nói "xem lịch hẹn của tôi", "tôi có lịch khám nào", "lịch hẹn sắp tới", "bác sĩ duyệt lịch chưa", "tình trạng lịch hẹn". CHỈ XEM — không đặt/huỷ lịch.
---

# Xem lịch hẹn của chính bệnh nhân (đọc ngầm → vẽ)

Nhiệm vụ **chỉ xem**: đọc tab Lịch hẹn ở chế độ NGẦM (bệnh nhân chỉ thấy hình bạn vẽ),
rồi trình bày bằng SVG. KHÔNG mở form đặt lịch, KHÔNG bấm "Đặt lịch".

## Chuỗi lệnh
1. `read_panel({ tab: "my-appointments", mode: "silent" })` — đọc ngầm.
2. Mỗi lịch hẹn là một phần tử `appointment:item:<id>` (role `text`), `value` = ngày
   giờ + trạng thái + bác sĩ (hoặc "đang chờ phòng khám phân bác sĩ") + tóm tắt từ trợ
   lý ảo + lời nhắn của bạn nếu có. Đọc hết
   các phần tử này (KHÔNG bịa — chỉ lấy giá trị đọc được). Danh sách này gồm **mọi**
   lịch của bệnh nhân, không tách subtab.
3. Xác định **phạm vi** theo yêu cầu: tất cả lịch, hay chỉ lịch sắp tới / chỉ lịch
   đang chờ duyệt / chỉ lịch đã duyệt. Lọc theo trạng thái + thời gian từ dữ liệu đã đọc.
4. `read_skills(['draw-svg'])` lấy quy tắc kỹ thuật, rồi vẽ **một** khối ```` ```svg ````
   + 1–2 câu dẫn dễ hiểu. Gợi ý bố cục: liệt kê theo thời gian (sớm → muộn), **mỗi lịch
   một dòng `y` riêng** (ngày giờ · bác sĩ · tóm tắt). Phân màu theo trạng thái: **chờ
   duyệt = cam/xanh dương**, **đã duyệt = xanh lá**, **đã khám/đã huỷ = xám**.

## Badcase
- **Không có lịch nào** trong phạm vi hỏi: báo gọn bằng lời ("Bạn chưa có lịch hẹn nào",
  "Hiện chưa có lịch sắp tới"), không cần vẽ hình rỗng.
- **Bệnh nhân muốn ĐẶT lịch mới:** đó là nhiệm vụ khác — gọi `read_skills(['book-appointment'])`.
- **Bệnh nhân muốn HUỶ một lịch:** thao tác huỷ chưa hỗ trợ qua chat; hướng dẫn bệnh
  nhân liên hệ phòng khám/bác sĩ. Chỉ trình bày, KHÔNG tự thao tác.
