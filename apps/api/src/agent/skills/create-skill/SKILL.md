---
name: create-skill
description: Dùng khi chuyên gia yêu cầu tạo skill mới hoặc chỉnh sửa skill hiện có trong thư viện. Hướng dẫn quy trình soạn thảo và ghi file SKILL.md qua tool write_skill.
---

# Skill: create-skill — Tạo và chỉnh sửa skill trong thư viện

## Mục đích

Mỗi skill trong thư viện là một file `SKILL.md` nằm tại `agent/skills/<tên-skill>/SKILL.md`. Skill mô tả một quy trình mà agent cần thực hiện khi gặp tình huống tương ứng. Tool `write_skill` ghi đè toàn bộ nội dung file — có thể gọi nhiều lần để tinh chỉnh đến khi hoàn thiện.

## Cấu trúc bắt buộc của một SKILL.md

```markdown
---
name: <tên-skill-kebab-case>
description: <1 dòng mô tả ngắn — dùng để xây index trong system prompt>
---

# Skill: <tên-skill> — <tiêu đề ngắn>

## Mục đích
<Skill này làm gì và giải quyết vấn đề gì>

## Khi nào dùng skill này
<Các dấu hiệu / câu người dùng nói để nhận biết cần dùng skill này>

## Quy trình
<Các bước thực hiện theo thứ tự — rõ ràng, có thể làm theo>

## Nguyên tắc
<Các ràng buộc, điều cần tránh, hoặc lưu ý đặc biệt>
```

**Quy tắc đặt tên:**
- Tên skill dùng kebab-case, chỉ gồm chữ cái, chữ số, gạch ngang (ví dụ: `patient-intake`, `lab-result-entry`).
- Tên phải ngắn gọn, mô tả đúng chức năng.
- `description` trong frontmatter là 1 dòng duy nhất — đây là nội dung hiển thị trong system prompt, phải đủ rõ để agent biết khi nào cần đọc skill.

---

## Trường hợp 1: Chuyên gia yêu cầu tạo skill mới

### Quy trình

1. **Lắng nghe mô tả từ chuyên gia** — chuyên gia mô tả skill muốn tạo: tên, mục đích, quy trình mong muốn.
2. **Đặt câu hỏi làm rõ** (nếu cần) — hỏi về: tên skill, khi nào dùng, các bước cụ thể, ràng buộc cần giữ.
3. **Soạn thảo nội dung SKILL.md** — dựa theo cấu trúc bắt buộc ở trên. Viết nội dung đầy đủ, rõ ràng, bằng tiếng Việt.
4. **Trình bày nội dung với chuyên gia** — hiển thị nội dung SKILL.md vừa soạn để chuyên gia xem trước.
5. **Ghi skill** — gọi `write_skill` với `{ name: "<tên-skill>", content: "<toàn bộ nội dung SKILL.md>" }`.
6. **Chờ phản hồi và lặp** — nếu chuyên gia muốn chỉnh sửa, gọi `write_skill` lại với nội dung mới. Lặp đến khi chuyên gia xác nhận hoàn thiện.
7. **Xác nhận hoàn tất** — thông báo skill đã được lưu vào thư viện, sẽ khả dụng từ cuộc trò chuyện tiếp theo.

---

## Trường hợp 2: Chuyên gia muốn xem hoặc chỉnh sửa skill cũ

### Quy trình

1. **Đọc nội dung skill** — gọi `read_skill` với `{ name: "<tên-skill>" }` để lấy nội dung hiện tại. Nội dung sẽ hiển thị lên tab Skill trong panel cho chuyên gia xem.
2. **Hiển thị và giải thích** — tóm tắt ngắn nội dung skill nếu cần, hỏi chuyên gia muốn thay đổi gì.
3. **Soạn nội dung chỉnh sửa** — giữ nguyên phần không đổi, chỉnh sửa phần chuyên gia yêu cầu.
4. **Ghi lại** — gọi `write_skill` với `{ name: "<tên-skill>", content: "<toàn bộ nội dung mới>" }`. Tool ghi đè hoàn toàn — luôn truyền file đầy đủ.
5. **Lặp** — tiếp tục chỉnh sửa nhiều lần qua nhiều lượt hội thoại đến khi hoàn thiện.

---

## Nguyên tắc

- **Trình bày trước, ghi sau.** Luôn cho chuyên gia xem nội dung trước khi gọi `write_skill`, trừ khi chuyên gia nói rõ "ghi luôn" hoặc "lưu luôn".
- **Ghi đè toàn bộ.** `write_skill` không append — luôn truyền nội dung đầy đủ của cả file.
- **Lặp đến khi đạt.** Một skill có thể qua nhiều lần chỉnh sửa qua nhiều lượt chat — đây là bình thường và được khuyến khích.
- **Tên skill là cố định sau khi tạo.** Nếu cần đổi tên, cần tạo skill mới với tên mới; file cũ giữ nguyên trừ khi có yêu cầu xoá.
- **Giữ ngôn ngữ tiếng Việt** trong toàn bộ nội dung skill (trừ thuật ngữ kỹ thuật cần giữ nguyên).
