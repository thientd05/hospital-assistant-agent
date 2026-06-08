---
name: collect-patient-info
description: Thu thập và điền thông tin cá nhân vào hồ sơ của chính bệnh nhân — họ tên, tuổi, giới tính, địa chỉ, số điện thoại (tab Hồ sơ, chế độ Sửa). Dùng khi bệnh nhân muốn "cập nhật/điền/sửa thông tin cá nhân, địa chỉ, số điện thoại" hoặc khi hồ sơ còn trống cần hoàn thiện.
---

# Thu thập thông tin bệnh nhân

Hồ sơ bệnh nhân tự đăng ký thường còn TRỐNG (chỉ có số điện thoại). Nhiệm vụ: hỏi
han, xác nhận từng thông tin rồi điền giúp bệnh nhân — không tự bịa.

## Chuỗi lệnh
1. `read_panel({ tab: "my-record", mode: "public" })`. Đọc snapshot xem trường nào đã có / còn trống.
2. Hỏi bệnh nhân những thông tin còn thiếu (họ tên, tuổi, giới tính, địa chỉ).
   **KHÔNG hỏi SĐT** — đã có sẵn (tài khoản đăng nhập); chỉ điền `patient-detail:phone`
   khi bệnh nhân **chủ động** muốn đổi số. Chỉ điền khi bệnh nhân đã cung cấp — KHÔNG suy diễn.
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
   **Bỏ qua `patient-detail:phone`** trừ khi bệnh nhân chủ động muốn đổi số (đã có sẵn).
4. Form đóng = đã lưu.

## Ràng buộc QUAN TRỌNG
- Bệnh nhân CHỈ sửa được: `name`, `age`, `gender`, `address`, `phone`.
- Snapshot ở chế độ sửa KHÔNG có ô sinh hiệu / chẩn đoán / thuốc / Khoa / mã BN —
  đó là phần do **bác sĩ** quản lý. ĐỪNG cố sửa, không có ref để nhắm.

## Badcase
- **Bệnh nhân muốn đổi sinh hiệu / chẩn đoán / thuốc / Khoa:** giải thích nhẹ nhàng
  rằng chỉ bác sĩ quản lý mới sửa được phần này; bệnh nhân nên trao đổi với bác sĩ
  khi tái khám.
- **Submit lỗi:** snapshot còn `patient-detail:error` (alert) — đọc nội dung, sửa
  trường tương ứng rồi click `patient-detail:save` lại.
- **Tuổi không phải số:** hỏi lại con số cụ thể trước khi điền.
