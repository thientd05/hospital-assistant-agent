---
name: prescribe-medications
description: Kê thuốc (chọn từ danh mục) và nhập chỉ định dùng cho bệnh nhân đang chọn. Dùng khi bác sĩ nói "kê thuốc/thêm/bỏ thuốc, ghi cách dùng".
---

# Chọn thuốc & chỉ định dùng

Thuốc nằm trong **hồ sơ chi tiết** (tab Bệnh nhân). Chọn từ **danh mục** (checkbox, KHÔNG gõ
tự do); mỗi thuốc thành một hàng kèm ô **chỉ định dùng** (cách uống) bác sĩ tự nhập.

**Tối thiểu:** 1 thuốc.

Vì có form chọn thuốc (modal) xen giữa, làm theo **3 nhịp** (mỗi nhịp 1 `act`, đọc snapshot trả về để lấy ref động):

1. Phân nhánh theo snapshot hồ sơ (`read_panel({ tab: "patients" })`):
   - **BN mới** ("Chưa kê thuốc"): cố gắng hỏi đủ **phác đồ + cách dùng** rồi làm.
   - **BN cũ**: bác sĩ nói gì làm luôn, không hỏi thêm.
2. **Mở form chọn thuốc:** `act([ {click patient-detail:edit}, {click patient-detail:medications-open} ])`. Snapshot trả về có các checkbox `med-picker:med:<id>` (`label` = tên thuốc, `checked` = đang kê). Danh mục dài → có thể `type med-picker:search` lọc rồi đọc lại.
3. **Tích thuốc + lưu form:** đối chiếu `label` lấy đúng `ref`, `check` (idempotent — thuốc cũ đã `checked` sẵn, CHỈ chạm thuốc cần thêm/bỏ), rồi lưu:
   ```
   act([
     { action: "check", ref: "med-picker:med:TH014", value: "true" },
     { action: "check", ref: "med-picker:med:TH021", value: "true" },
     { action: "click", ref: "med-picker:save" }
   ])
   ```
   Bỏ một thuốc đang kê: `check` với `value: "false"`.
   **Ngay sau khi lưu form, hệ thống TỰ kiểm tra tương tác** (nếu ≥2 thuốc) — đọc `patient-detail:med-interaction` (alert) trong snapshot trả về: **có tương tác nguy hiểm thì cảnh báo rõ cho bác sĩ, KHÔNG bỏ qua.**
4. **Nhập chỉ định dùng + lưu hồ sơ:** form đóng → mỗi thuốc đã chọn có ô `patient-detail:med-<i>:instruction` (`label` = "Cách dùng <tên>"). Nhập rồi lưu:
   ```
   act([
     { action: "type",  ref: "patient-detail:med-0:instruction", value: "Sáng 1 viên sau ăn" },
     { action: "type",  ref: "patient-detail:med-1:instruction", value: "Sáng tối mỗi lần 1 viên" },
     { action: "click", ref: "patient-detail:save" }
   ])
   ```
   - Chỉ định là văn bản tự do (sáng/tối, trước/sau ăn, số lần/ngày…). Bác sĩ không nêu thì để trống.
   - Bỏ một thuốc khỏi đơn (sau khi đóng form): nút `patient-detail:med-<i>:remove`.

## Badcase
- **Chưa chọn bệnh nhân:** `click patient:<id>:open` rồi quay lại bước 1.
- **Thuốc không có trong danh mục:** không có checkbox nào khớp `label` (kể cả sau khi tìm) → báo bác sĩ, KHÔNG bịa ref, không kê thuốc ngoài danh mục.
- **Bác sĩ đòi sửa sinh hiệu/xét nghiệm/chẩn đoán/Khoa:** đó là skill khác — gọi `read_skills` skill tương ứng.
- **Submit lỗi:** đọc `patient-detail:error` (alert), sửa rồi `click patient-detail:save` lại.
