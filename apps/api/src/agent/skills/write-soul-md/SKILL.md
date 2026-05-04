---
name: write-soul-md
description: Dùng khi người dùng yêu cầu thay đổi cách agent làm việc (tone, định dạng, mức chi tiết, từ viết tắt, điều cần tránh…), hoặc khi agent nhận ra preference lặp lại đủ để ghi thành quy tắc lâu dài.
---

# Skill: write-soul-md — Cập nhật phong cách làm việc (SOUL.md)

## Mục đích

`SOUL.md` trả lời câu hỏi **"Người dùng này muốn tôi làm việc như thế nào?"** — preferences cá nhân về tone, định dạng, mức độ chi tiết, ngôn ngữ, điều luôn làm / không bao giờ làm. Không lưu sự thật danh tính (→ USER.md) hay sự kiện xảy ra một lần (→ MEMORY.md).

## Khi nào dùng skill này

- Người dùng nói: "đừng giải thích dài", "luôn dùng bullet", "hãy ngắn gọn thôi", "không cần hỏi lại khi tôi đã nói rõ", "lưu cách làm việc này"
- Agent nhận ra mình đã sửa theo preference giống nhau ít nhất 2 lần → đây là quy tắc, không phải yêu cầu một lần
- Người dùng nói "nhớ điều này cho lần sau" và nội dung là về cách tương tác, không phải sự kiện

## Quy trình

1. **Đọc nội dung hiện tại** — gọi `read_memory` với `{ file: "SOUL.md" }`. Nếu rỗng, bắt đầu từ template trắng bên dưới.
2. **Xác định preference mới** — tóm tắt rõ: quy tắc là gì, áp dụng khi nào. Nếu chưa rõ, hỏi ngắn gọn một lần.
3. **Soạn nội dung mới** — merge vào template, giữ các quy tắc cũ còn hiệu lực, xoá/sửa quy tắc bị thay thế, thêm quy tắc mới.
4. **Ghi lại** — gọi `update_working_style` với `{ content: "<toàn bộ nội dung SOUL.md mới>" }`. Tool ghi đè toàn bộ file — luôn truyền nội dung đầy đủ.
5. **Xác nhận** — báo ngắn gọn đã lưu, và áp dụng ngay từ câu trả lời tiếp theo.

---

## Template theo vai trò

### Bác sĩ (BS00X)

```markdown
# Phong cách làm việc — BS00X

## Tone & giọng văn
- (ví dụ: đồng nghiệp ngang cấp / thầy thuốc chuyên nghiệp / thân thiện informal…)

## Định dạng phản hồi
- (ví dụ: ưu tiên bullet ngắn / không dùng bảng / luôn tóm tắt ≤3 dòng trước khi chi tiết…)

## Mức độ chi tiết
- (ví dụ: chỉ đưa kết luận, không giải thích cơ chế / luôn kèm y văn tham chiếu / không dài hơn 200 từ…)

## Thuật ngữ & viết tắt
- (ví dụ: dùng tên INN thay tên biệt dược / chấp nhận viết tắt BS, BN, mmHg, SpO2… / dùng tiếng Việt, không lẫn tiếng Anh trừ tên thuốc…)

## Quy tắc luôn làm
- (ví dụ: luôn nêu khoảng tham chiếu khi báo xét nghiệm bất thường…)

## Quy tắc không bao giờ làm
- (ví dụ: không hỏi xác nhận khi bác sĩ đã cho mã BN rõ ràng / không tóm tắt lại những gì bác sĩ vừa nói…)

## Ghi chú khác
-
```

---

### Quản lý phòng khám (QL00X)

```markdown
# Phong cách làm việc — QL00X

## Tone & giọng văn
- (ví dụ: báo cáo chuyên nghiệp / hội thoại thân mật / súc tích kiểu executive summary…)

## Định dạng phản hồi
- (ví dụ: ưu tiên bảng số liệu / không dán JSON thô / luôn kèm nhận xét so sánh kỳ trước…)

## Mức độ chi tiết
- (ví dụ: tóm tắt ≤5 bullet cho mỗi báo cáo / chỉ nêu ngoại lệ, không liệt kê đầy đủ…)

## Quy tắc luôn làm
- (ví dụ: luôn nêu tổng số và tỷ lệ % khi báo thống kê / luôn đề xuất hành động kèm số liệu…)

## Quy tắc không bao giờ làm
- (ví dụ: không dùng từ ngữ y khoa kỹ thuật / không hỏi chi tiết khi đã có đủ dữ liệu…)

## Ghi chú khác
-
```

---

### Bệnh nhân / Khách hàng (BN00X)

```markdown
# Phong cách làm việc — BN00X

## Tone & giọng văn
- (ví dụ: thân thiện, dễ hiểu / tránh thuật ngữ y khoa / dùng ngôi "bạn" hay "anh/chị"…)

## Định dạng phản hồi
- (ví dụ: trả lời ngắn gọn / ưu tiên gạch đầu dòng / không dài hơn 150 từ mỗi lần…)

## Mức độ chi tiết
- (ví dụ: giải thích cơ chế đơn giản / chỉ đưa khuyến nghị thực tế, không lý thuyết…)

## Chủ đề ưu tiên tư vấn
- (ví dụ: dinh dưỡng, giảm cân, giấc ngủ, kiểm soát huyết áp…)

## Quy tắc luôn làm
- (ví dụ: luôn nhắc hỏi bác sĩ trước khi thay đổi thuốc / luôn xác nhận triệu chứng trước khi đưa gợi ý…)

## Quy tắc không bao giờ làm
- (ví dụ: không đưa liều thuốc cụ thể / không dùng từ "chẩn đoán" hay "điều trị" thay bằng "gợi ý" / không dài dòng khi bệnh nhân đã hỏi thẳng…)

## Ghi chú khác
-
```

---

### Chuyên gia huấn luyện AI (CG00X)

```markdown
# Phong cách làm việc — CG00X

## Tone & giọng văn
- (ví dụ: kỹ thuật chính xác / thân thiện đồng nghiệp / súc tích không giải thích dài…)

## Định dạng phản hồi
- (ví dụ: ưu tiên bullet / luôn kèm ví dụ prompt cụ thể / không dán nội dung quá dài…)

## Mức độ chi tiết
- (ví dụ: chỉ nêu vấn đề và gợi ý, không phân tích dài / luôn giải thích lý do thay đổi prompt…)

## Quy tắc luôn làm
- (ví dụ: luôn so sánh prompt trước/sau khi đề xuất thay đổi / luôn nêu mục tiêu cải thiện cụ thể…)

## Quy tắc không bao giờ làm
- (ví dụ: không bịa thông tin y khoa để minh hoạ / không thay đổi prompt mà không giải thích lý do…)

## Ghi chú khác
-
```

---

## Nguyên tắc

- **SOUL mạnh hơn mặc định.** Khi SOUL.md có quy tắc, áp dụng ngay — không chờ người dùng nhắc lại.
- **Preference ≠ sự kiện.** "Lần này anh cần ngắn" → không ghi. "Anh luôn muốn ngắn gọn" → ghi vào SOUL.
- **Không trùng USER / MEMORY.** Danh tính/nghề nghiệp → USER. Sự kiện/bài học → MEMORY. Cách tương tác → SOUL.
- **Xoá quy tắc lỗi thời.** Nếu người dùng thay đổi preference (ví dụ: từ "ngắn gọn" sang "chi tiết"), xoá/sửa quy tắc cũ thay vì append mâu thuẫn.
- **Ghi đè toàn bộ.** `update_working_style` không append — luôn truyền file đầy đủ sau khi merge.
- **Áp dụng ngay.** Sau khi ghi SOUL.md, câu trả lời kế tiếp trong cùng session phải phản ánh quy tắc mới.
