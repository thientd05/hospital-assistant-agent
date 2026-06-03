---
name: check-drug-interaction
description: Kiểm tra tương tác giữa các thuốc (tab Tương tác thuốc). Dùng khi bác sĩ nói "kiểm tra tương tác thuốc".
---

# Kiểm tra tương tác thuốc

Thuốc được **chọn từ danh sách có sẵn** (checkbox), KHÔNG gõ tên tự do.

## Chuỗi lệnh
1. `read_panel({ tab: "drug-check" })` — xem các checkbox thuốc. Mỗi thuốc là 1 phần tử `checkbox` ref `drug-check:drug:<id>`, nhãn (`label`) là tên thuốc. Đối chiếu thuốc bác sĩ yêu cầu với `label` để lấy đúng `ref`.
2. Gộp trong MỘT batch `act`: `check` từng thuốc cần kiểm rồi `click` submit. Cần ít nhất 2 thuốc.
   ```
   act({ actions: [
     { action: "check", ref: "drug-check:drug:warfarin" },
     { action: "check", ref: "drug-check:drug:aspirin" },
     { action: "click", ref: "drug-check:submit" }
   ]})
   ```
3. Đọc `drug-check:result` (alert) trong snapshot và báo lại bác sĩ. Có tương tác nguy hiểm → cảnh báo rõ, không bỏ qua.

## Badcase
- **Không tìm thấy thuốc trong danh sách:** thuốc bác sĩ hỏi không có checkbox nào khớp `label` → báo bác sĩ rằng thuốc đó chưa có trong danh mục kiểm tra, không bịa ref.
- **Chọn < 2 thuốc:** xuất hiện `drug-check:error` (alert) — chọn thêm thuốc rồi submit lại.
- **Kiểm tra lại bộ thuốc khác:** các checkbox đã tick vẫn giữ → `check` thêm với `value: "false"` để bỏ tick, hoặc `click` `drug-check:clear` để bỏ chọn tất cả trước.
- **Hỏi tương tác với thuốc bệnh nhân đang dùng:** lấy danh sách thuốc từ hồ sơ (tab Hồ sơ), đối chiếu với `label` các checkbox rồi tick.
