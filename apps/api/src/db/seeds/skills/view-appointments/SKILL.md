---
name: view-appointments
description: Xem/trình bày lịch hẹn của bác sĩ — chờ duyệt, đã duyệt, hoặc cả hai — dưới dạng hình trực quan. Dùng khi bác sĩ nói "xem lịch hẹn", "lịch chờ duyệt", "lịch đã duyệt", "hôm nay/tuần này có lịch nào", "ai đang chờ khám". CHỈ ĐỌC — không duyệt/huỷ.
---

# Xem lịch hẹn (đọc ngầm → vẽ)

Nhiệm vụ **chỉ đọc**: đọc tab Lịch hẹn ở chế độ NGẦM (bác sĩ chỉ thấy hình bạn vẽ), rồi
trình bày bằng SVG. KHÔNG bấm "Duyệt"/"Nhận"/"Huỷ" (đó là việc bác sĩ tự quyết).

## Chuỗi lệnh
1. `read_panel({ tab: "appointments", mode: "silent" })` — đọc ngầm.
2. Tab Lịch hẹn có 2 subtab: `appointment-subtab:pending` ("Chờ duyệt") và
   `appointment-subtab:approved` ("Đã duyệt"); subtab đang mở có `data-agent-active`.
   Mỗi lịch là một phần tử `appointment:<id>:info` (role `text`, `value` = ngày giờ +
   tên/mã BN + tóm tắt từ trợ lý ảo + lời nhắn từ bệnh nhân nếu có).
3. Lấy đủ dữ liệu theo **phạm vi** bác sĩ hỏi:
   - Chỉ **chờ duyệt** → đọc subtab pending (mặc định thường mở sẵn).
   - Chỉ **đã duyệt** → nếu chưa mở: `act([{ action: "click", ref: "appointment-subtab:approved" }])`
     (kế thừa chế độ ngầm) rồi đọc snapshot trả về.
   - **Cả hai** → đọc subtab hiện tại, rồi `act` chuyển subtab kia và đọc tiếp.
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
