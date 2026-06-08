---
name: collect-patient-info
description: Thu thập và điền thông tin cá nhân vào hồ sơ của chính bệnh nhân — họ tên, tuổi, giới tính, địa chỉ (tab Hồ sơ, chế độ Sửa). Dùng khi bệnh nhân muốn "cập nhật/điền/sửa thông tin cá nhân, địa chỉ" hoặc khi hồ sơ còn trống cần hoàn thiện.
---

# Thu thập thông tin bệnh nhân

Hồ sơ bệnh nhân tự đăng ký thường còn TRỐNG (chỉ có số điện thoại). Nhiệm vụ: hỏi
han, xác nhận từng thông tin rồi điền giúp bệnh nhân — không tự bịa.

## Chuỗi lệnh
1. `read_panel({ tab: "my-record", mode: "public" })`. Đọc snapshot xem trường nào đã có / còn trống.
2. Hỏi bệnh nhân những thông tin còn thiếu (họ tên, tuổi, giới tính, địa chỉ).
   **KHÔNG hỏi/điền SĐT** — số điện thoại CỐ ĐỊNH (là tài khoản đăng nhập), không ai
   sửa được kể cả bệnh nhân. Chỉ điền khi bệnh nhân đã cung cấp — KHÔNG suy diễn.
3. Vào chế độ sửa, điền đúng các trường có dữ liệu trong MỘT batch `act`:
   ```
   act({ actions: [
     { action: "click",  ref: "patient-detail:edit" },
     { action: "type",   ref: "patient-detail:name",    value: "<họ tên>" },
     { action: "type",   ref: "patient-detail:age",     value: "<tuổi>" },
     { action: "select", ref: "patient-detail:gender",  value: "Nam" },
     { action: "type",   ref: "patient-detail:address", value: "<địa chỉ>" },
     { action: "click",  ref: "patient-detail:save" }
   ]})
   ```
   Chỉ `type`/`select` trường nào bệnh nhân vừa cung cấp; bỏ qua trường chưa có.
   **KHÔNG có ô SĐT** — số điện thoại cố định, không có ref để nhắm.
4. Form đóng = đã lưu.

## Ràng buộc QUAN TRỌNG
- Bệnh nhân CHỈ sửa được: `name`, `age`, `gender`, `address`.
- **SĐT cố định** (tài khoản đăng nhập) — không ai sửa được. Bệnh nhân đòi đổi số:
  giải thích số điện thoại gắn với tài khoản nên không thể thay đổi.
- Snapshot ở chế độ sửa KHÔNG có ô sinh hiệu / chẩn đoán / thuốc / Khoa / mã BN —
  đó là phần do **bác sĩ** quản lý. ĐỪNG cố sửa, không có ref để nhắm.

## Badcase
- **Bệnh nhân muốn đổi sinh hiệu / chẩn đoán / thuốc / Khoa:** giải thích nhẹ nhàng
  rằng chỉ bác sĩ quản lý mới sửa được phần này; bệnh nhân nên trao đổi với bác sĩ
  khi tái khám.
- **Submit lỗi:** snapshot còn `patient-detail:error` (alert) — đọc nội dung, sửa
  trường tương ứng rồi click `patient-detail:save` lại.
- **Tuổi không phải số:** hỏi lại con số cụ thể trước khi điền.
