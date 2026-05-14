---
name: patient-intake
description: Quy trình tiếp nhận bệnh nhân mới — mở form trước, hỏi thêm sau, không chặn bác sĩ.
---

# Quy trình tiếp nhận bệnh nhân mới

## Khi nào áp dụng

Khi bác sĩ nói các câu hàm ý bắt đầu tiếp nhận một bệnh nhân chưa có trong hệ thống:
- "Tiếp nhận bệnh nhân mới"
- "Có bệnh nhân mới đến"
- "Tạo hồ sơ bệnh nhân"
- "Bắt đầu nhập bệnh nhân"
- (hoặc tương đương)

## Nguyên tắc lõi: MỞ FORM TRƯỚC, HỎI SAU

Bác sĩ thường vừa tiếp xúc bệnh nhân vừa yêu cầu bạn — họ cần thấy form xuất hiện NGAY để biết cấu trúc dữ liệu cần thu thập. Hỏi xong mới mở form là phá trải nghiệm.

- ❌ KHÔNG hỏi "Cho mình biết họ tên, tuổi, khoa…" rồi mới gọi `open_patient_form`.
- ✅ ĐÚNG: gọi `open_patient_form` ngay (rỗng cũng được), rồi mới hỏi tiếp.

## Cấu trúc form

**Bắt buộc** (phải đủ trước khi submit, nếu thiếu backend sẽ trả lỗi):
- `name` — họ tên (chuỗi không rỗng)
- `age` — tuổi (số nguyên ≥ 0, truyền dạng chuỗi)
- `ward` — khoa/phòng (chuỗi không rỗng)

**Tuỳ chọn** (có thì điền, không thì để trống):
- `gender` — `"Nam"` hoặc `"Nữ"` (mặc định `"Nam"`)
- `medications` — chuỗi, nhiều thuốc cách nhau bằng dấu phẩy
- `spO2` — SpO2 % (chuỗi số, ví dụ `"98"`)
- `heartRate` — nhịp tim bpm (chuỗi số, ví dụ `"72"`)
- `bloodPressure` — huyết áp dạng chuỗi tự do, ví dụ `"120/80"`
- `temperature` — nhiệt độ °C (chuỗi số thập phân, ví dụ `"36.7"`)

**KHÔNG có ở form tiếp nhận:**
- Chẩn đoán. Chẩn đoán là kết quả CUỐI của lần khám, được nhập sau khi đã có hồ sơ thông qua form sửa hồ sơ — không thuộc bước tiếp nhận. Nếu bác sĩ nhắc trong câu đầu, chỉ ghi nhận để dùng sau; KHÔNG truyền vào `open_patient_form`.

## Các bước

### 1. Trích thông tin có sẵn từ câu của bác sĩ

Bác sĩ thường gửi kèm vài field trong câu đầu, ví dụ:
- "Tiếp nhận bệnh nhân Nguyễn Văn A, 45 tuổi, khoa Nội"
  → `name="Nguyễn Văn A"`, `age="45"`, `ward="Nội"`
- "Có bệnh nhân nữ 30 tuổi vào khoa Sản, mạch 92, SpO2 96"
  → `gender="Nữ"`, `age="30"`, `ward="Sản"`, `heartRate="92"`, `spO2="96"`
- "Tiếp nhận bệnh nhân"
  → trích được rỗng, vẫn sang bước 2.

### 2. Gọi `open_patient_form` NGAY

- Có thông tin → truyền vào tool.
- Không có gì → gọi rỗng `open_patient_form()`, form trống vẫn mở.

KHÔNG hỏi thêm trước bước này.

### 3. Phản hồi ngắn cho bác sĩ

Sau khi tool trả `fields`:
- Báo gọn các field đã pre-fill (nếu có) — không lặp lại từng giá trị bác sĩ vừa nói.
- Liệt kê field BẮT BUỘC còn thiếu (`name`, `age`, `ward`) và hỏi gọn.
- Sinh hiệu/thuốc tuỳ chọn — chỉ hỏi khi bác sĩ ngụ ý muốn nhập, không tự ép.

### 4. Khi bác sĩ bổ sung

Gọi tiếp `open_patient_form` với CHỈ field mới — tool tự merge: field truyền vào ghi đè, field không truyền giữ nguyên.

### 5. Submit

Khi bác sĩ ra hiệu lưu, hoặc đã đủ 3 field bắt buộc và bác sĩ không bổ sung gì thêm → gọi `submit_patient_form`. Báo lại mã BN mới (`BS00X`) hoặc lỗi nguyên văn.

## Mẹo nhận diện

- **Tuổi**: "5 tuổi" → `age="5"`. "Khoảng 50" → `age="50"` (xấp xỉ chấp nhận; bác sĩ có thể chỉnh trên form).
- **Giới tính**: từ đại từ — "anh/ông/chú" → `Nam`; "chị/bà/cô" → `Nữ`. Không rõ thì để mặc định, KHÔNG chặn bước 2.
- **Khoa**: chấp nhận viết tắt ("Nội", "Sản", "Nhi", "Cấp cứu"). Form lưu nguyên văn.
- **Thuốc**: nối nhiều thuốc bằng dấu phẩy, ví dụ `medications: "amlodipine 5mg, metformin 500mg"`.
- **Sinh hiệu**: chỉ điền khi bác sĩ cung cấp số đo; nếu bác sĩ chỉ nói "ổn định" hay mô tả chung — KHÔNG suy diễn ra số. Hỏi lại nếu cần con số chính xác.
