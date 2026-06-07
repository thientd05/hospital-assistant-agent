---
name: view-exam-history
description: Xem lại LỊCH SỬ KHÁM / diễn tiến / quá trình điều trị của bệnh nhân và vẽ DASHBOARD trực quan. Dùng khi bác sĩ nói "xem lịch sử khám", "diễn tiến bệnh", "các lần khám trước", "quá trình điều trị", "huyết áp thay đổi thế nào".
---

# Dashboard lịch sử khám

Mục tiêu: lấy lịch sử khám của bệnh nhân rồi **tự thiết kế một dashboard HTML xịn** (như Claude web) để bác sĩ xem trực quan diễn tiến — thay vì liệt kê dài dòng bằng chữ. Bố cục, màu sắc, kiểu biểu đồ... do bạn tự quyết — miễn đẹp và rõ.

## Chuỗi lệnh
1. `read_panel({ tab: "patients" })` → tìm **mã bệnh nhân đang chọn** (hồ sơ chi tiết / ref `patient:<id>:open`). Chưa chọn BN → bảo bác sĩ chọn trước (xem Badcase).
2. `read_exam_history({ patientId: "<id>" })` → nhận `{ patientId, count, records: [...] }`. `records` sắp **mới nhất trước**; mỗi record có `examDate, doctorName, ward, diagnoses[], medications[{name,instruction}], vitals{spO2,heartRate,bloodPressure,temperature}, labResults[{name,value,unit,referenceRange,isAbnormal}]`.
3. **Xuất MỘT khối ```html```** chứa trang dashboard tự-chứa (HTML+CSS+JS inline, **KHÔNG CDN ngoài**). FE render trong iframe cô lập. Trả lời chữ chỉ 1 câu ngắn ("Đây là tổng quan các lần khám của bác …"), phần còn lại để dashboard nói.

## Nên có gì trên dashboard (gợi ý, tự do biến tấu)
- **Header**: tên bệnh nhân · khoa · số lần khám.
- **Vài thẻ tóm tắt**: lần khám gần nhất, chẩn đoán chính, số thuốc đang dùng, huyết áp/sinh hiệu gần nhất...
- **Biểu đồ xu hướng sinh hiệu** theo thời gian (huyết áp tâm thu, nhịp tim, SpO2...) — cho đổi chỉ số nếu muốn.
- **Timeline từng lần khám** (sắp mới→cũ): ngày, sinh hiệu, chẩn đoán, thuốc, lab — **lab bất thường (`isAbnormal`) tô đỏ nổi bật**.
- Màu nhã, nền nhạt, bo góc, có khoảng thở, chữ rõ, **tiếng Việt**, `max-width:100%` responsive.
- **Không bịa số** — chỉ dùng dữ liệu trả về. Không có lịch sử (`count===0`) → báo gọn bằng chữ, không vẽ.

## 2 RÀNG BUỘC CỨNG (để dashboard vẽ DẦN realtime khi stream — đừng vi phạm)
FE lộ HTML dần theo token và **chỉ chạy `<script>` MỘT lần ở cuối**. Vì vậy:

1. **Viết NỘI DUNG bằng HTML TĨNH — dữ liệu điền sẵn thẳng trong markup.** Header, thẻ tóm tắt, từng lần khám trong timeline đều là thẻ HTML có sẵn giá trị thật. **TUYỆT ĐỐI KHÔNG** để `<div id="...">` rỗng rồi đổ nội dung bằng `innerHTML`/`createElement` trong `<script>` — làm vậy toàn bộ nội dung sẽ "bụp" ra cùng lúc ở cuối (vì script chạy ở cuối), mất hiệu ứng vẽ dần.
2. **`<script>` CHỈ để TƯƠNG TÁC** (gắn `onclick` cho nút, vẽ lại biểu đồ khi đổi chỉ số...), không để dựng nội dung. Hệ quả: nút/tương tác chỉ bấm được sau khi gen xong — đúng mong muốn.

**Biểu đồ** cũng nên vẽ dần: xuất **SVG TĨNH với toạ độ tính sẵn** cho chỉ số mặc định ngay trong markup (tự tính x/y theo min–max của dữ liệu). Cần đổi chỉ số (nút) thì dùng `<script>` ở cuối gắn `onclick` + vẽ lại — phần này hiện sau, chấp nhận được. (Nếu lười tính toạ độ, vẫn được vẽ chart bằng JS, nhưng nó sẽ pop ở cuối thay vì vẽ dần.)

## Muốn chia TAB (tổng quan / đồ thị / timeline là các tab riêng)?
Được, nhưng làm SAI sẽ hỏng hiệu ứng vẽ dần. **TUYỆT ĐỐI KHÔNG** đặt `display:none` cho tab ẩn ngay trong CSS tĩnh: lúc stream, các tab ẩn vẫn vẽ vào markup nhưng bị che → bác sĩ ngồi nhìn tab đầu đứng yên, **không bấm chuyển tab được** (JS chưa chạy) suốt khúc giữa. Thay vào đó dùng pattern **"hiện hết khi stream, gập thành tab ở cuối"**:
- CSS tĩnh: **mọi panel đều hiện** (không panel nào `display:none`) → lúc stream xem từng panel vẽ dần lần lượt (cuộn dọc), không cái nào bị giấu.
- `<script>` ở cuối: thêm class vào body (vd `document.body.className="tabbed"`) để **lúc đó mới** bật rule `.tabbed .panel{display:none}` `.tabbed .panel.active{display:block}`, đồng thời gắn `onclick` nút chuyển tab. Mặc định active = tab tổng quan.
- Kết quả: stream thì xem vẽ dần đầy đủ; gen xong dashboard tự gập thành dạng tab, nút bấm được. Cú "gập" nhẹ ở cuối là bình thường.

## Badcase
- **Chưa chọn bệnh nhân:** đọc panel không thấy hồ sơ chi tiết → bảo bác sĩ chọn một bệnh nhân ở tab Bệnh nhân trước, rồi thử lại.
- **Không có lịch sử (`count===0`):** báo gọn "Bệnh nhân chưa có lịch sử khám nào được ghi nhận", không vẽ dashboard rỗng.
- **Bác sĩ chỉ hỏi 1 con số cụ thể** (vd "lần trước huyết áp bao nhiêu"): trả lời thẳng bằng chữ, không cần vẽ cả dashboard.
