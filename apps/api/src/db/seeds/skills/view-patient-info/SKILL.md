---
name: view-patient-info
description: Xem/trình bày thông tin của MỘT bệnh nhân — toàn bộ hồ sơ hoặc một phần (hành chính, sinh hiệu, xét nghiệm, chẩn đoán, thuốc) — dưới dạng hình trực quan. Dùng khi bác sĩ nói "xem/cho xem thông tin/hồ sơ bệnh nhân", "tóm tắt sinh hiệu", "kết quả xét nghiệm của …", "đang dùng thuốc gì", "chẩn đoán hiện tại". CHỈ ĐỌC — không sửa.
---

# Xem thông tin bệnh nhân (đọc ngầm → vẽ)

Đây là nhiệm vụ **chỉ đọc**: đọc hồ sơ ở chế độ NGẦM (panel không hiện ra, bác sĩ chỉ
thấy hình bạn vẽ), rồi trình bày bằng SVG. KHÔNG vào chế độ sửa, KHÔNG bấm Lưu.

## Chuỗi lệnh
1. `read_panel({ tab: "patients", mode: "silent" })` — đọc ngầm.
2. Định vị hồ sơ theo snapshot:
   - Thấy `patient-detail:edit` (+ các `patient-detail:*`) = **đang ở hồ sơ chi tiết**.
     Nếu đúng BN bác sĩ hỏi → sang bước 3.
   - Chỉ thấy **danh sách** (`patient:<id>:open`) = chưa chọn → đối chiếu tên/mã BN bác
     sĩ nêu lấy đúng `ref`, rồi điều hướng ngầm:
     `act([{ action: "click", ref: "patient:<id>:open" }])` (kế thừa chế độ ngầm) →
     dùng snapshot trả về.
   - Đang mở hồ sơ một BN **KHÁC** với BN được hỏi → quay ra rồi chọn lại:
     `act([{ action: "click", ref: "patient-detail:back" }, { action: "click", ref: "patient:<id>:open" }])`.
3. Đọc dữ liệu từ các phần tử role `text` trong snapshot (KHÔNG bịa — chỉ lấy `value`/`label`
   đọc được):
   - **Hành chính:** `patient-detail:name`, `:age`, `:gender`, `:ward`, `:address`, `:phone`.
   - **Sinh hiệu:** `patient-detail:spO2`, `:heartRate`, `:bloodPressure`, `:temperature`.
   - **Xét nghiệm:** các `patient-detail:lab-<i>` (mỗi dòng tên + kết quả + đơn vị + tham chiếu).
   - **Chẩn đoán:** `patient-detail:diagnoses`.
   - **Thuốc:** các `patient-detail:med-<i>`.
4. Xác định **phạm vi** theo yêu cầu: toàn bộ hồ sơ, hay chỉ một phần (chỉ sinh hiệu /
   chỉ xét nghiệm / chỉ thuốc / chỉ chẩn đoán). Chỉ vẽ phần được hỏi; bác sĩ nói "toàn
   bộ"/"hồ sơ" thì vẽ gộp các phần có dữ liệu.
5. `read_skills(['draw-svg'])` lấy quy tắc kỹ thuật, rồi vẽ **một** khối ```` ```svg ````
   trình bày dữ liệu vừa đọc + 1–2 câu dẫn. **Giá trị bất thường tô đỏ/cam**, bình
   thường tô xanh lá; nhóm theo mục (hành chính / sinh hiệu / xét nghiệm / chẩn đoán /
   thuốc), mỗi mục một dòng riêng.

## Badcase
- **Không xác định được BN** (tên mơ hồ / không có trong danh sách): hỏi lại bác sĩ chọn
  hoặc nêu rõ mã BN, KHÔNG đoán mã, KHÔNG vẽ bừa.
- **Phần được hỏi đang trống** (vd "Chưa có kết quả xét nghiệm"): ghi rõ "chưa có" trong
  hình/câu trả lời, đừng bịa số.
- **Bác sĩ muốn SỬA** (thêm/đổi sinh hiệu, lab, chẩn đoán, thuốc, Khoa): đó là nhiệm vụ
  khác — gọi `read_skills` skill sửa tương ứng (chế độ public, có thao tác).
- **Xem diễn tiến/các lần khám trước** (lịch sử khám): dùng skill `view-exam-history`,
  không phải skill này.
