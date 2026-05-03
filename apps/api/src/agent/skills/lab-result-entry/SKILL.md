---
name: lab-result-entry
description: Dùng khi bác sĩ chuyên khoa đọc kết quả xét nghiệm (1 hoặc nhiều giá trị) cho một bệnh nhân và muốn ghi vào hồ sơ. Có bảng tham chiếu đơn vị + khoảng bình thường để tự suy ra `unit`, `referenceRange`, `isAbnormal` khi bác sĩ chỉ đọc tên + giá trị; push vào `labResults` qua `update_patient.add_lab_results` mà không ghi đè lab cũ.
---

# Skill: lab-result-entry — Ghi kết quả xét nghiệm

Bác sĩ thường đọc kết quả nhanh và rời rạc ("Troponin 0.12", "K 5.4 mmol/L", "pH 7.31, PaCO2 58"). Skill này giúp bạn:
- Bổ sung trường còn thiếu (đơn vị, khoảng tham chiếu, cờ bất thường) bằng bảng tham chiếu phía dưới.
- Push vào `labResults` của bệnh nhân, KHÔNG ghi đè lab cũ.
- Diễn giải lâm sàng ngắn gọn cho mỗi giá trị bất thường.

## Khi nào dùng

- "Có kết quả xét nghiệm…", "Trả về kết quả…", "Ghi xét nghiệm cho BN0xx…"
- Bác sĩ liệt kê 1+ cặp `<tên> = <giá trị>` trong cùng tin nhắn.

## Tools

- `get_patient_record` — xác nhận bệnh nhân tồn tại + xem hồ sơ trước khi push.
- `get_lab_results` — xem N lab gần nhất khi cần kiểm tra trùng lặp.
- `update_patient` — push entry mới qua trường `add_lab_results` (server `$push` tự xử, không bao giờ ghi đè cả mảng).

KHÔNG còn `db_read`/`db_write`. KHÔNG cần `$push`/`$each`/Mongo lingo — chỉ truyền mảng entries cho `add_lab_results`.

## Schema một entry

```ts
{
  name: "Troponin I",
  value: 0.08,                  // số nếu định lượng, chuỗi nếu định tính ("Dương tính", "Bình thường")
  unit: "ng/mL",
  referenceRange: "<0.04",      // chuỗi: "<X", ">X", "X-Y", "Âm tính", v.v.
  isAbnormal: true,             // tự suy ra từ value vs referenceRange
  recordedAt?: ISODate          // optional — server tự đặt nếu không truyền
}
```

## Bảng tham chiếu

### Tim mạch

| Test | Đơn vị | Bình thường | Ý nghĩa khi bất thường |
|---|---|---|---|
| Troponin I | ng/mL | <0.04 | tổn thương cơ tim cấp |
| Troponin T-hs | ng/L | <14 | tổn thương cơ tim |
| NT-proBNP | pg/mL | <125 | suy tim, áp lực thất trái cao |
| CK-MB | U/L | <16 | tổn thương cơ tim |
| Cholesterol total | mmol/L | <5.2 | rối loạn lipid |
| LDL-C | mmol/L | <3.4 | nguy cơ xơ vữa |
| HDL-C (nam) | mmol/L | >1.0 | thấp = nguy cơ |
| HDL-C (nữ) | mmol/L | >1.3 | thấp = nguy cơ |
| Triglyceride | mmol/L | <1.7 | rối loạn lipid |
| INR | – | 0.8-1.2 | rối loạn đông máu / chỉnh warfarin |

### Thận – Điện giải – Chuyển hoá

| Test | Đơn vị | Bình thường |
|---|---|---|
| Creatinine (nam) | mg/dL | 0.7-1.2 |
| Creatinine (nữ) | mg/dL | 0.6-1.1 |
| eGFR | mL/phút/1.73m² | >90 |
| Urea | mmol/L | 2.5-7.5 |
| Acid uric | mg/dL | 2.4-6.0 |
| Natri | mmol/L | 135-145 |
| Kali | mmol/L | 3.5-5.0 |
| Clo | mmol/L | 95-105 |
| Calcium toàn phần | mmol/L | 2.15-2.55 |
| Glucose đói | mmol/L | 3.9-6.1 |
| HbA1c | % | <6.5 |

### Huyết học

| Test | Đơn vị | Bình thường |
|---|---|---|
| Hb (nam) | g/dL | 13-17 |
| Hb (nữ) | g/dL | 12-15 |
| Hematocrit | % | 35-45 |
| Bạch cầu | K/µL | 4-10 |
| Bạch cầu trung tính | % | 50-70 |
| Tiểu cầu | K/µL | 150-400 |
| MCV | fL | 80-100 |

### Gan mật – Tuỵ

| Test | Đơn vị | Bình thường |
|---|---|---|
| AST | U/L | <40 |
| ALT | U/L | <40 |
| GGT | U/L | <50 |
| Bilirubin TP | µmol/L | <17 |
| Albumin | g/L | 35-50 |
| Amylase | U/L | 30-110 |
| Lipase | U/L | <60 |

### Viêm – Nhiễm trùng – Hồi sức

| Test | Đơn vị | Bình thường | Ý nghĩa khi tăng |
|---|---|---|---|
| CRP | mg/L | <5 | viêm |
| Procalcitonin | ng/mL | <0.5 | nhiễm khuẩn nặng / sepsis |
| Lactate | mmol/L | <2 | giảm tưới máu mô |
| Ferritin (nam) | ng/mL | 30-400 | viêm hoặc thừa sắt |
| Ferritin (nữ) | ng/mL | 13-150 | viêm hoặc thừa sắt |

### Khí máu động mạch (ABG)

| Test | Đơn vị | Bình thường |
|---|---|---|
| pH | – | 7.35-7.45 |
| PaCO2 | mmHg | 35-45 |
| PaO2 | mmHg | 80-100 |
| HCO3- | mmol/L | 22-26 |
| SaO2 | % | >95 |

### Sản – Nước tiểu

| Test | Đơn vị | Bình thường |
|---|---|---|
| Protein niệu 24h | g/24h | <0.3 |
| Protein/Creatinine niệu | mg/g | <30 |

### Định tính / huyết thanh học

| Test | Bình thường |
|---|---|
| NS1 Dengue | Âm tính |
| Anti-HCV | Âm tính |
| HBsAg | Âm tính |
| Anti-HIV | Âm tính |
| Test nhanh COVID | Âm tính |

## Quy trình

### Bước 1 — Xác định bệnh nhân

Nếu chưa có `patientId` trong tin nhắn, hỏi bác sĩ. KHÔNG sinh ID mới — xét nghiệm thuộc về hồ sơ đã có; nếu chưa có hồ sơ, dùng skill `patient-intake` trước.

`get_patient_record` để xác nhận:
```json
{ "patient_id": "BN012" }
```
(Panel Hồ sơ ở UI tự bung — bác sĩ thấy ngay đúng bệnh nhân.)

### Bước 2 — Phân tích từng cặp `<tên> = <giá trị>`

Cho mỗi xét nghiệm bác sĩ đọc:

1. **Chuẩn hoá tên** sang dạng đầy đủ trong bảng. Một số viết tắt thường gặp:
   - K → Kali, Na → Natri, Ca → Calcium, Cl → Clo
   - TG → Triglyceride, Chol → Cholesterol total
   - Tro → Troponin I, BNP → NT-proBNP
   - Hct → Hematocrit, Plt / TC → Tiểu cầu, WBC / BC → Bạch cầu
   - Cr → Creatinine
2. **Đơn vị**: lấy từ bảng nếu bác sĩ không nói. Nếu bác sĩ ghi đơn vị khác bảng, dùng theo bác sĩ và CHUYỂN ĐỔI khoảng tham chiếu nếu cần — nếu không chắc, hỏi.
3. **referenceRange**: copy đúng định dạng chuỗi từ bảng (`"<0.04"`, `"3.5-5.0"`, `"Âm tính"`).
4. **isAbnormal** suy tự động:
   - `"<X"` → bất thường nếu `value >= X`
   - `">X"` → bất thường nếu `value <= X`
   - `"X-Y"` → bất thường nếu `value < X || value > Y`
   - Định tính → so chuỗi.
5. **Tên KHÔNG có trong bảng và bác sĩ không đưa khoảng tham chiếu** → hỏi lại, KHÔNG đoán.

### Bước 3 — Ghi qua `update_patient.add_lab_results`

Một xét nghiệm đơn:
```json
{
  "id": "BN012",
  "add_lab_results": [
    {
      "name": "Troponin I",
      "value": 0.12,
      "unit": "ng/mL",
      "referenceRange": "<0.04",
      "isAbnormal": true
    }
  ]
}
```

Nhiều xét nghiệm cùng turn — gửi cả mảng trong một call `update_patient`:
```json
{
  "id": "BN012",
  "add_lab_results": [
    { "name": "Troponin I", "value": 0.12, "unit": "ng/mL", "referenceRange": "<0.04", "isAbnormal": true },
    { "name": "NT-proBNP",  "value": 2840, "unit": "pg/mL", "referenceRange": "<125",  "isAbnormal": true },
    { "name": "Kali",       "value": 5.4,  "unit": "mmol/L", "referenceRange": "3.5-5.0", "isAbnormal": true }
  ]
}
```

`recordedAt` không cần truyền — server tự đặt mỗi entry.

### Bước 4 — Kiểm tra trùng lặp (khi nghi ngờ)

Nếu trong tin nhắn trước đó (cùng phiên) bác sĩ đã đọc xét nghiệm cùng tên, dùng `get_lab_results` xem 5 lab gần nhất:
```json
{ "patient_id": "BN012", "limit": 5 }
```
Nếu trùng tên + giá trị + ghi cách dưới vài phút → hỏi bác sĩ trước khi push lần nữa.

### Bước 5 — Báo cáo lại

Trả lời ngắn cho bác sĩ:
- Số xét nghiệm đã ghi.
- Liệt kê các giá trị BẤT THƯỜNG: `<tên> <giá trị> <đơn vị> (ngưỡng <ref>) — <ý nghĩa lâm sàng 1 dòng>`.
- Nếu có tên không khớp bảng → nêu rõ "đang chờ bác sĩ xác nhận khoảng tham chiếu cho X".

## Quy tắc

- **Nhiều entry/turn**: dồn vào MỘT `update_patient` với mảng `add_lab_results` đầy đủ, không spam nhiều call.
- **Chuẩn hoá tên**: ghi tên đầy đủ vào DB (`"Kali"` thay vì `"K"`). Bác sĩ tra cứu sau dễ hơn.
- **Đơn vị quyết định ngưỡng**: Glucose 110 (mg/dL) ≠ Glucose 110 (mmol/L) — nếu bác sĩ không chỉ đơn vị và giá trị nằm vùng mơ hồ, hỏi.
- **Không tự thêm xét nghiệm** bác sĩ không đọc. Bảng tham chiếu chỉ để diễn giải, không để gợi ý chỉ định mới.
- **Khi `isAbnormal: true`**: luôn nêu giá trị + ngưỡng + ý nghĩa lâm sàng (1 dòng) trong reply, theo SOUL.
- **Giá trị định tính**: dùng tiếng Việt thống nhất ("Dương tính", "Âm tính", "Bình thường", "Không phát hiện").
- **Specialty awareness**: ưu tiên panel khớp với khoa của bác sĩ trong USER.md (Tim mạch → Troponin/BNP/lipid; Nhi truyền nhiễm → NS1/Hct/tiểu cầu; Hồi sức → ABG/Lactate/Procalcitonin).

## Mẫu hội thoại

> **BS:** "BN001: Troponin 0.12, NT-proBNP 2840, K 5.4."
>
> **Agent:**
> 1. `get_patient_record {patient_id:"BN001"}` xác nhận bệnh nhân tồn tại (panel Hồ sơ tự bung).
> 2. Tra bảng:
>    - Troponin I → ng/mL, <0.04, **bất thường**.
>    - NT-proBNP → pg/mL, <125, **bất thường**.
>    - Kali → mmol/L, 3.5–5.0, **bất thường** (tăng nhẹ).
> 3. `update_patient` với `add_lab_results` 3 entry trong cùng một call.
> 4. Trả lời:
>    > "Đã ghi 3 kết quả cho BN001. Đáng chú ý:
>    > • Troponin I 0.12 ng/mL (ngưỡng <0.04) — tổn thương cơ tim cấp.
>    > • NT-proBNP 2840 pg/mL (ngưỡng <125) — phù hợp suy tim mất bù / quá tải thất.
>    > • Kali 5.4 mmol/L (3.5–5.0) — tăng kali nhẹ, đề nghị kiểm tra ECG và xem lại lợi tiểu giữ kali / ACE inhibitor.
>    > Bác sĩ muốn tôi kiểm tra tương tác thuốc hiện tại không?"
