---
name: check-drug-interaction
description: Kiểm tra tương tác giữa các thuốc (tab Tương tác thuốc). Dùng khi bác sĩ nói "kiểm tra tương tác thuốc".
---

# Kiểm tra tương tác thuốc

## Chuỗi lệnh
1. `open_panel({ tab: "drug-check" })`.
2. Gộp trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "type",  ref: "drug-check:input", value: "warfarin, aspirin" },
     { action: "click", ref: "drug-check:submit" }
   ]})
   ```
   Danh sách thuốc cách nhau dấu phẩy; cần ít nhất 2 thuốc mới có ý nghĩa.
3. Đọc `drug-check:result` (alert) trong snapshot và báo lại bác sĩ. Có tương tác nguy hiểm → cảnh báo rõ, không bỏ qua.

## Badcase
- **Nhập rỗng/không hợp lệ:** xuất hiện `drug-check:error` (alert) — bổ sung thuốc rồi submit lại.
- **Hỏi tương tác với thuốc bệnh nhân đang dùng:** lấy danh sách thuốc từ hồ sơ (tab Hồ sơ) rồi nhập vào ô này.
