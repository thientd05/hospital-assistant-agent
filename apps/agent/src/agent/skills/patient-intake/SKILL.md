---
name: patient-intake
description: Quy trình tiếp nhận bệnh nhân mới — mở form trước, điền & lưu bằng một batch tool act, hỏi thêm sau, không chặn bác sĩ.
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

- ❌ KHÔNG hỏi "Cho mình biết họ tên, tuổi, khoa…" rồi mới mở form.
- ✅ ĐÚNG: mở panel + mở form ngay (kể cả khi chưa có dữ liệu), rồi mới hỏi tiếp.

## Các `ref` của form tạo bệnh nhân

Nút mở form (ở tab Bệnh nhân): `patients:create`.

Field trong form (dùng với action `type`, riêng giới tính dùng `select`):
- `patient-form:name` — họ tên (**bắt buộc**)
- `patient-form:age` — tuổi, số nguyên ≥ 0 (**bắt buộc**)
- `patient-form:ward` — khoa/phòng (**bắt buộc**)
- `patient-form:gender` — `select`, giá trị `"Nam"` hoặc `"Nữ"` (mặc định `"Nam"`)
- `patient-form:medications` — nhiều thuốc cách nhau dấu phẩy
- `patient-form:spO2` — SpO2 % (vd `"98"`)
- `patient-form:heartRate` — nhịp tim bpm (vd `"72"`)
- `patient-form:bloodPressure` — huyết áp (vd `"120/80"`)
- `patient-form:temperature` — nhiệt độ °C (vd `"36.7"`)
- `patient-form:submit` — nút "Tạo" (lưu)
- `patient-form:cancel` — nút "Huỷ"

> **KHÔNG có ở form tiếp nhận:** Chẩn đoán. Chẩn đoán là kết quả CUỐI của lần khám, nhập sau qua form sửa hồ sơ (tab Hồ sơ). Nếu bác sĩ nhắc trong câu đầu, chỉ ghi nhận để dùng sau.

## Các bước

### 1. Trích thông tin có sẵn từ câu của bác sĩ
Ví dụ:
- "Tiếp nhận bệnh nhân Nguyễn Văn A, 45 tuổi, khoa Nội" → name="Nguyễn Văn A", age="45", ward="Nội".
- "Bệnh nhân nữ 30 tuổi vào khoa Sản, mạch 92, SpO2 96" → gender="Nữ", age="30", ward="Sản", heartRate="92", spO2="96".
- "Tiếp nhận bệnh nhân" → trích được rỗng, vẫn sang bước 2.

### 2. Mở panel + mở form NGAY
Gọi `open_panel({ tab: "patients" })`. Trong snapshot trả về sẽ có `patients:create`.

### 3. Điền & lưu bằng MỘT batch `act`
Gộp việc mở form + điền các field đã biết + bấm Tạo vào **một** lần `act` (frontend chờ form hiện ra rồi mới điền). Ví dụ khi đã đủ 3 field bắt buộc:

```
act({ actions: [
  { action: "click",  ref: "patients:create" },
  { action: "type",   ref: "patient-form:name",  value: "Nguyễn Văn A" },
  { action: "type",   ref: "patient-form:age",   value: "45" },
  { action: "select", ref: "patient-form:gender", value: "Nam" },
  { action: "type",   ref: "patient-form:ward",  value: "Nội" },
  { action: "click",  ref: "patient-form:submit" }
]})
```

Chỉ thêm các action sinh hiệu/thuốc khi bác sĩ có cung cấp số đo.

### 4. Nếu CHƯA đủ field bắt buộc
Mở form và điền những gì đã có, **đừng bấm submit**:

```
act({ actions: [
  { action: "click", ref: "patients:create" },
  { action: "type",  ref: "patient-form:age",  value: "30" },
  { action: "type",  ref: "patient-form:ward", value: "Sản" }
]})
```

Rồi hỏi gọn field bắt buộc còn thiếu (ví dụ họ tên). Khi bác sĩ bổ sung, gọi `act` tiếp để `type` field mới rồi `click patient-form:submit`.

### 5. Xác nhận kết quả
Đọc snapshot trong kết quả `act`:
- **Thành công**: các `ref` `patient-form:*` biến mất (form đã đóng) → bệnh nhân đã được tạo. Báo gọn cho bác sĩ.
- **Lỗi**: kết quả `{ ok: false, ... }` và/hoặc snapshot còn phần tử `role: "alert"` — đọc text alert (vd thiếu Họ tên/Khoa, tuổi không hợp lệ), sửa lại field tương ứng bằng `act` rồi submit lại, hoặc hỏi bác sĩ.

## Mẹo nhận diện
- **Tuổi**: "5 tuổi" → "5". "Khoảng 50" → "50" (xấp xỉ chấp nhận; bác sĩ chỉnh được trên form).
- **Giới tính**: "anh/ông/chú" → Nam; "chị/bà/cô" → Nữ. Không rõ thì để mặc định, KHÔNG chặn bước mở form.
- **Khoa**: chấp nhận viết tắt ("Nội", "Sản", "Nhi", "Cấp cứu"). Lưu nguyên văn.
- **Thuốc**: nối bằng dấu phẩy, vd "amlodipine 5mg, metformin 500mg".
- **Sinh hiệu**: chỉ điền khi bác sĩ cung cấp số đo; bác sĩ nói "ổn định" → KHÔNG suy diễn ra số.
