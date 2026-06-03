---
name: check-drug-interaction
description: Kiểm tra tương tác giữa các thuốc (tab Tương tác thuốc). Dùng khi bác sĩ nói "kiểm tra tương tác thuốc".
---

# Kiểm tra tương tác thuốc

Thuốc được **chọn từ danh mục có sẵn** (checkbox), KHÔNG gõ tên tự do.

## Chuỗi lệnh
1. `read_panel({ tab: "drug-check" })` — xem các checkbox thuốc. Mỗi thuốc là 1 phần tử `checkbox` ref `drug-check:drug:<id>` (id dạng `TH00X`), nhãn (`label`) là tên thuốc đầy đủ kèm hàm lượng (vd "Aspirin 81mg"). Đối chiếu thuốc bác sĩ yêu cầu với `label` để lấy đúng `ref`.
2. Danh mục dài → nếu không thấy thuốc cần, gõ vào `drug-check:search` để lọc rồi `read_panel` lại lấy ref.
3. Gộp trong MỘT batch `act`: `check` từng thuốc cần kiểm rồi `click` submit. Cần ít nhất 2 thuốc.
   ```
   act({ actions: [
     { action: "check", ref: "drug-check:drug:TH014" },
     { action: "check", ref: "drug-check:drug:TH015" },
     { action: "click", ref: "drug-check:submit" }
   ]})
   ```
4. Đọc `drug-check:result` (alert) trong snapshot và báo lại bác sĩ. Có tương tác nguy hiểm → cảnh báo rõ, không bỏ qua.

## Badcase
- **Không tìm thấy thuốc trong danh mục:** không có checkbox nào khớp `label` (kể cả sau khi tìm) → báo bác sĩ thuốc đó chưa có trong danh mục, KHÔNG bịa ref.
- **Chọn < 2 thuốc:** xuất hiện `drug-check:error` (alert) — chọn thêm thuốc rồi submit lại.
- **Kiểm tra lại bộ thuốc khác:** các checkbox đã tick vẫn giữ → `check` thêm với `value: "false"` để bỏ tick, hoặc `click` `drug-check:clear` để bỏ chọn tất cả trước.
- **Hỏi tương tác với thuốc bệnh nhân đang dùng:** lấy danh sách thuốc từ hồ sơ (tab Hồ sơ), đối chiếu với `label` các checkbox rồi tick.
