---
name: patient-intake
description: Dùng khi bác sĩ yêu cầu tiếp nhận / ghi chép / bổ sung / cập nhật thông tin bệnh nhân. Tạo bản ghi rỗng bằng `create_patient` rồi cập nhật từng phần qua nhiều lần `update_patient`, không ghi đè toàn bộ.
---

# Skill: patient-intake — Tiếp nhận & ghi chép thông tin bệnh nhân

Hướng dẫn xử trí khi bác sĩ ghi chép thông tin bệnh nhân mới hoặc bổ sung thông tin cho bệnh nhân hiện có. Bác sĩ thường gửi thông tin RỜI RẠC qua nhiều tin nhắn — skill này dạy bạn duy trì một bản ghi duy nhất và cập nhật từng phần một, KHÔNG ghi đè toàn bộ.

## Khi nào dùng skill này

Kích hoạt khi bác sĩ nói (hoặc tương đương):

- "Bắt đầu ghi chép thông tin bệnh nhân mới"
- "Tiếp nhận bệnh nhân BN0xx"
- "Tạo hồ sơ cho bệnh nhân"
- "Ghi triệu chứng ban đầu"
- "Bổ sung thông tin cho BN0xx"
- "Cập nhật vital của BN0xx"

## Tools cần dùng

- `create_patient` — tạo hồ sơ mới. Mã `id` do tool tự sinh (BN + số kế tiếp), bạn KHÔNG cần truyền.
- `update_patient` — cập nhật từng phần lên hồ sơ đã có (theo `id`). Hỗ trợ scalar (`name`/`age`/`gender`/`ward`), `vitals` partial, và các phép `add_*`/`remove_*` cho mảng `diagnoses`/`medications`/`labResults`.
- `get_patient_record` — đọc lại sau khi cập nhật quan trọng để xác nhận với bác sĩ.

KHÔNG còn `db_read`/`db_write`. KHÔNG cần (và không có cách) viết biểu thức Mongo trực tiếp.

## Cấu trúc bản ghi `patients`

```ts
{
  id: "BN012",                        // tool tự sinh, định dạng BN + số (zero-pad ≥3 chữ số)
  name: "Nguyễn Văn A",
  age: 58,
  gender: "Nam" | "Nữ",
  ward: "Nội Tim mạch",
  diagnoses: ["Tăng huyết áp", ...],  // mảng chuỗi
  vitals: {
    spO2: 91,
    heartRate: 102,
    bloodPressure: "148/92",          // chuỗi tâm thu/tâm trương
    temperature: 37.1,
    recordedAt: ISODate                // server tự đặt mỗi lần vitals đổi
  },
  medications: ["Amlodipine 5mg", ...],
  labResults: [
    { name, value, unit, referenceRange, isAbnormal, recordedAt }
  ]
}
```

## Quy trình

### Bước 1 — Tạo hồ sơ NGAY khi bác sĩ yêu cầu

Gọi `create_patient` với những trường bác sĩ đã nói (có thể chưa có gì — tool sẽ fill placeholder). Mã `id` mới được tool sinh và trả về.

```json
{ "name": "", "age": 0 }
```

(Nếu bác sĩ đã đọc luôn vài trường: gửi luôn — đỡ phải `update_patient` ngay sau đó.)

```json
{
  "name": "Trần Thu Hà",
  "age": 62,
  "gender": "Nữ",
  "ward": "Nội Thận"
}
```

Output: `{ ok: true, id: "BN011", patient: {...} }`. Đọc `id` trong kết quả rồi báo: "Đã tạo BN011, bác sĩ điền tiếp thông tin nhé."

### Bước 2 — Cập nhật từng phần với `update_patient`

Mỗi tin nhắn của bác sĩ thường chỉ chứa 1–3 trường. Dùng `update_patient` với `id` + các trường tương ứng. Tool đảm bảo KHÔNG ghi đè cả mảng — bạn chỉ cần truyền đúng tên trường.

**Trường vô hướng (`name`/`age`/`gender`/`ward`):**
```json
{
  "id": "BN012",
  "name": "Lê Văn Bình",
  "age": 45,
  "gender": "Nam"
}
```

**Sinh hiệu — `vitals` partial (chỉ truyền field bác sĩ vừa đọc):**
```json
{
  "id": "BN012",
  "vitals": {
    "spO2": 92,
    "heartRate": 110,
    "bloodPressure": "150/90"
  }
}
```
`vitals.recordedAt` server tự đặt = thời điểm hiện tại; không cần truyền.

**Thêm chẩn đoán (không trùng phần tử đã có):**
```json
{ "id": "BN012", "add_diagnoses": ["Đau ngực điển hình"] }
```

**Thêm nhiều thuốc cùng lúc:**
```json
{
  "id": "BN012",
  "add_medications": ["Aspirin 81mg", "Atorvastatin 20mg"]
}
```

**Gỡ một chẩn đoán nhập nhầm:**
```json
{ "id": "BN012", "remove_diagnoses": ["Cơn đau quặn mật"] }
```

**Thêm kết quả xét nghiệm** (chi tiết ở skill `lab-result-entry`):
```json
{
  "id": "BN012",
  "add_lab_results": [
    {
      "name": "Troponin I",
      "value": 0.08,
      "unit": "ng/mL",
      "referenceRange": "<0.04",
      "isAbnormal": true
    }
  ]
}
```
`recordedAt` cho mỗi entry server tự đặt nếu bạn không truyền.

### Bước 3 — Đọc lại để xác nhận sau cập nhật quan trọng

Dùng `get_patient_record` với `patient_id`. Panel Hồ sơ ở UI tự bung — bác sĩ thấy ngay.

Trình bày ngắn gọn cho bác sĩ những trường vừa thay đổi.

## Quy tắc bắt buộc

- **Một thao tác = một tool call.** Không gộp nhiều bệnh nhân vào một call.
- **Không cố ghi đè cả mảng.** Cứ dùng `add_*` / `remove_*` — tool đã đảm bảo an toàn.
- **Không truyền `vitals.recordedAt`** — server tự đặt mỗi lần `vitals` thay đổi.
- **Sửa giá trị nhập sai**: `update_patient` với cùng tên trường vô hướng (sẽ ghi đè) hoặc `remove_*` rồi `add_*` cho mảng. KHÔNG có tool xoá hồ sơ — tránh rủi ro.
- **Không tự suy diễn**: chỉ ghi những gì bác sĩ nói. Nếu không rõ, hỏi lại bằng câu ngắn.
- **Không dịch / chuẩn hoá tên thuốc, chẩn đoán** sang tiếng Anh nếu bác sĩ ghi tiếng Việt — giữ nguyên cách bác sĩ nhập.
- **Mã bệnh nhân**: KHÔNG tự đoán mã mới khi tạo. `create_patient` tự sinh. Khi cập nhật, dùng đúng `id` đã có (lấy từ kết quả `create_patient` trước đó hoặc bác sĩ cung cấp).

## Mẫu hội thoại điển hình

> BS: "Tiếp nhận bệnh nhân mới."
> Agent: [`create_patient {}` → `{id: "BN011"}`] → "Đã tạo BN011, bác sĩ điền tiếp thông tin."
>
> BS: "Tên Trần Thu Hà, 62 tuổi, nữ, khoa Nội Thận."
> Agent: [`update_patient {id:"BN011", name:"Trần Thu Hà", age:62, gender:"Nữ", ward:"Nội Thận"}`] → "Đã ghi nhận. Còn sinh hiệu / chẩn đoán?"
>
> BS: "Mạch 96, HA 170/100, SpO2 95, sốt 37.4."
> Agent: [`update_patient {id:"BN011", vitals:{heartRate:96, bloodPressure:"170/100", spO2:95, temperature:37.4}}`] → "Vitals đã lưu. HA 170/100 (cao), nên theo dõi sát."
>
> BS: "Thêm chẩn đoán tiền sản giật."
> Agent: [`update_patient {id:"BN011", add_diagnoses:["Tiền sản giật"]}`] → "Đã thêm vào danh sách chẩn đoán."
>
> BS: "Cho tôi xem lại toàn bộ."
> Agent: [`get_patient_record {patient_id:"BN011"}`] → trình bày bản ghi gọn gàng (panel Hồ sơ tự bung).
