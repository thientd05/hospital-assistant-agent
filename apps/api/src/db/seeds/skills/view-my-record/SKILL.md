---
name: view-my-record
description: Xem/trình bày hồ sơ của CHÍNH bệnh nhân — toàn bộ hoặc một phần (hành chính, sinh hiệu, xét nghiệm, chẩn đoán, thuốc) — dưới dạng hình trực quan. Dùng khi bệnh nhân nói "xem hồ sơ của tôi", "kết quả xét nghiệm của tôi thế nào", "tôi đang dùng thuốc gì", "sinh hiệu/huyết áp của tôi", "bác sĩ chẩn đoán tôi bị gì". CHỈ XEM — không sửa.
---

# Xem hồ sơ của chính bệnh nhân (đọc ngầm → vẽ)

Nhiệm vụ **chỉ xem**: đọc hồ sơ ở chế độ NGẦM (panel không hiện ra, bệnh nhân chỉ
thấy hình bạn vẽ), rồi trình bày bằng SVG. KHÔNG vào chế độ Sửa, KHÔNG bấm Lưu.

Hồ sơ chỉ có MỘT — của chính bệnh nhân đang đăng nhập (tab Hồ sơ, `selfMode`).
KHÔNG có danh sách / không phải chọn bệnh nhân nào.

## Chuỗi lệnh
1. `read_panel({ tab: "my-record", mode: "silent" })` — đọc ngầm hồ sơ của mình.
2. Đọc dữ liệu từ các phần tử role `text` trong snapshot (KHÔNG bịa — chỉ lấy
   `value`/`label` đọc được):
   - **Hành chính:** `patient-detail:name`, `:age`, `:gender`, `:ward`, `:address`, `:phone`.
   - **Sinh hiệu:** `patient-detail:spO2`, `:heartRate`, `:bloodPressure`, `:temperature`.
   - **Xét nghiệm:** các `patient-detail:lab-<i>` (mỗi dòng tên + kết quả + đơn vị + tham chiếu).
   - **Chẩn đoán:** `patient-detail:diagnoses`.
   - **Thuốc:** các `patient-detail:med-<i>`.
3. Xác định **phạm vi** theo yêu cầu: toàn bộ hồ sơ, hay chỉ một phần (chỉ sinh hiệu /
   chỉ xét nghiệm / chỉ thuốc / chỉ chẩn đoán). Chỉ vẽ phần được hỏi; bệnh nhân nói
   "toàn bộ"/"hồ sơ" thì vẽ gộp các phần có dữ liệu.
4. `read_skills(['draw-svg'])` lấy quy tắc kỹ thuật, rồi vẽ **một** khối ```` ```svg ````
   trình bày dữ liệu vừa đọc + 1–2 câu dẫn dễ hiểu. **Giá trị bất thường tô đỏ/cam**,
   bình thường tô xanh lá; nhóm theo mục (hành chính / sinh hiệu / xét nghiệm / chẩn
   đoán / thuốc), mỗi mục một dòng riêng.

## Lưu ý cách nói
- Bệnh nhân không phải chuyên gia y tế: giải thích bằng lời **dễ hiểu**, tránh thuật
  ngữ khó; chỉ số bất thường thì nói nhẹ nhàng và khuyên trao đổi với bác sĩ, **KHÔNG
  tự kết luận/chẩn đoán thay bác sĩ**.

## Badcase
- **Phần được hỏi đang trống** (vd "Chưa có kết quả xét nghiệm", "Chưa có chẩn đoán"):
  ghi rõ "chưa có" trong hình/câu trả lời, đừng bịa số.
- **Bệnh nhân muốn SỬA thông tin cá nhân** (họ tên, tuổi, giới tính, địa chỉ): đó là
  nhiệm vụ khác — gọi `read_skills(['collect-patient-info'])`.
- **Bệnh nhân muốn đổi sinh hiệu / chẩn đoán / thuốc / Khoa:** giải thích nhẹ nhàng
  rằng chỉ bác sĩ quản lý mới ghi/sửa được phần này; bệnh nhân nên trao đổi với bác sĩ
  khi tái khám. KHÔNG có ref để sửa các trường đó.
- **Bệnh nhân muốn xem lịch hẹn của mình:** dùng skill `view-my-appointments`, không
  phải skill này.
