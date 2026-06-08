---
name: view-appointments
description: Xem/trình bày lịch hẹn của bác sĩ — chờ duyệt, đã duyệt, hoặc cả hai — dưới dạng hình trực quan. Dùng khi bác sĩ nói "xem lịch hẹn", "lịch chờ duyệt", "lịch đã duyệt", "hôm nay/tuần này có lịch nào", "ai đang chờ khám". CHỈ ĐỌC — không duyệt/huỷ.
---

# Xem lịch hẹn (đọc ngầm → vẽ)

Nhiệm vụ **chỉ đọc**: đọc tab Lịch hẹn ở chế độ NGẦM (bác sĩ chỉ thấy hình bạn vẽ), rồi
trình bày bằng SVG. KHÔNG bấm "Duyệt"/"Nhận"/"Huỷ" (đó là việc bác sĩ tự quyết).

## Chuỗi lệnh
1. `read_panel({ tab: "appointments", mode: "silent" })` — đọc ngầm.
2. Mỗi lịch hẹn là một phần tử `appointment:<id>:info` (role `text`), `value` = ngày giờ
   + **trạng thái** ("Chờ duyệt" hoặc "Đã duyệt") + tên/mã BN + tóm tắt từ trợ lý ảo +
   lời nhắn từ bệnh nhân nếu có. Danh sách gồm **MỌI** lịch trong **một** danh sách (cả hai
   trạng thái lẫn hàng chờ chung) — KHÔNG còn tab con tách trạng thái, đọc một lần là đủ.
3. Lấy đủ dữ liệu rồi **lọc theo phạm vi** bác sĩ hỏi, dựa vào trạng thái + thời gian đọc
   được (KHÔNG bịa — chỉ lấy giá trị đọc được):
   - Chỉ **chờ duyệt** → giữ các lịch trạng thái "Chờ duyệt".
   - Chỉ **đã duyệt** → giữ các lịch trạng thái "Đã duyệt".
   - **Cả hai** / hôm nay / tuần này → lọc theo thời gian, giữ cả hai trạng thái.
4. `read_skills(['draw-svg'])` lấy quy tắc kỹ thuật, rồi vẽ **một** khối ```` ```svg ````
   + 1–2 câu dẫn. Gợi ý bố cục: liệt kê theo thời gian (sớm → muộn), **mỗi lịch một dòng
   `y` riêng** (ngày giờ · BN · tóm tắt). Phân màu theo trạng thái: **chờ duyệt = cam/xanh
   dương**, **đã duyệt = xanh lá**. Xem cả hai thì tách 2 nhóm có tiêu đề rõ.

## Badcase
- **Không có lịch** trong phạm vi hỏi: báo gọn bằng lời ("Hiện chưa có lịch chờ duyệt"),
  không cần vẽ hình rỗng.
- **Bác sĩ muốn DUYỆT/NHẬN/HUỶ một lịch:** đó là thao tác bác sĩ tự bấm trên panel; bạn
  chỉ trình bày, không tự bấm. Nếu bác sĩ yêu cầu rõ thì mở panel công khai
  (`read_panel({ tab: "appointments", mode: "public" })`) để bác sĩ thấy và tự quyết.
