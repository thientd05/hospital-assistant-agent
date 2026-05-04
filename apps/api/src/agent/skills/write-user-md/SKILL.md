---
name: write-user-md
description: Dùng khi người dùng yêu cầu lưu thông tin cá nhân/nghề nghiệp vào hồ sơ, hoặc khi agent học được sự thật ổn định về người dùng qua trò chuyện và muốn ghi vào USER.md để không hỏi lại lần sau.
---

# Skill: write-user-md — Cập nhật hồ sơ người dùng (USER.md)

## Mục đích

`USER.md` trả lời câu hỏi **"Tôi đang nói chuyện với ai?"** — sự thật ổn định, ít thay đổi về danh tính và phạm vi công việc của người dùng. Không lưu preferences (→ SOUL.md) hay sự kiện xảy ra trong session (→ MEMORY.md).

## Khi nào dùng skill này

- Người dùng nói: "hãy nhớ tôi là…", "lưu thông tin về tôi", "ghi vào hồ sơ của tôi"
- Agent vừa học được sự thật ổn định (khoa, chuyên môn, chức danh, tình trạng sức khoẻ mãn tính…) và USER.md hiện còn trống hoặc thiếu trường đó
- Người dùng xác nhận/chỉnh sửa thông tin vốn đã có trong USER.md

## Quy trình

1. **Đọc nội dung hiện tại** — gọi `read_memory` với `{ file: "USER.md" }`. Nếu rỗng, bắt đầu từ template trắng bên dưới.
2. **Xác định vai trò** — nhìn vào phần system prompt USER.md hiện tại hoặc mã người dùng (`BS` / `QL` / `BN`).
3. **Thu thập thông tin còn thiếu** (nếu cần) — hỏi ngắn gọn. Không bịa, không giả định. Chỉ hỏi các trường quan trọng còn trống; không hỏi tất cả cùng lúc.
4. **Soạn nội dung mới** — dùng template phù hợp vai trò ở dưới, giữ nguyên các trường đã đúng, cập nhật/bổ sung trường mới.
5. **Ghi lại** — gọi `update_user_profile` với `{ content: "<toàn bộ nội dung USER.md mới>" }`. Tool ghi đè toàn bộ file — luôn truyền nội dung đầy đủ, không chỉ phần thay đổi.
6. **Xác nhận** — báo ngắn gọn đã lưu thành công.

---

## Template theo vai trò

### Bác sĩ (BS00X)

```markdown
# Hồ sơ bác sĩ

- **Mã:** BS00X
- **Họ tên:** 
- **Chức danh:** (Bác sĩ / Bác sĩ CKI / Bác sĩ CKII / Thạc sĩ / Tiến sĩ / Phó Giáo sư / Giáo sư…)
- **Khoa:** 
- **Chuyên môn sâu:** (ví dụ: Tim mạch can thiệp, Nhi sơ sinh, Nội tiết đái tháo đường…)
- **Thâm niên:** (số năm hoặc khoảng "~10 năm")
- **Bệnh viện / Phòng khám:** 
- **Phạm vi thực hành:** (loại bệnh nhân, thủ thuật thường làm, phân công trực…)
- **Ghi chú thêm:** (kiến thức nền, ngôn ngữ y khoa ưa dùng, điều gì khác biệt về bệnh nhân của khoa này…)
```

**Trường bắt buộc:** Mã, Họ tên, Khoa.
**Trường ưu tiên:** Chuyên môn sâu, Phạm vi thực hành — giúp agent tra cứu và gợi ý sát hơn.

---

### Quản lý phòng khám (QL00X)

```markdown
# Hồ sơ quản lý phòng khám

- **Mã:** QL00X
- **Họ tên:** 
- **Chức danh:** (Giám đốc / Phó Giám đốc / Trưởng phòng / Điều phối viên…)
- **Tên phòng khám / đơn vị:** 
- **Phạm vi quản lý:** (các khoa/bộ phận phụ trách, quy mô, số bác sĩ trực thuộc…)
- **Nhiệm vụ thường xuyên:** (báo cáo, tuyển dụng, lịch trực, chất lượng dịch vụ…)
- **Ghi chú thêm:** 
```

**Trường bắt buộc:** Mã, Họ tên, Tên phòng khám.

---

### Bệnh nhân / Khách hàng (BN00X)

```markdown
# Hồ sơ bệnh nhân

- **Mã:** BN00X
- **Họ tên:** 
- **Tuổi:** 
- **Giới tính:** Nam / Nữ
- **Tình trạng sức khoẻ quan tâm:** (bệnh mãn tính đang theo dõi, triệu chứng đang gặp, vấn đề muốn tư vấn…)
- **Tiền sử bệnh nổi bật:** (dị ứng, phẫu thuật đã qua, bệnh gia đình…)
- **Thuốc đang dùng:** (nếu có)
- **Mục tiêu sức khoẻ:** (ví dụ: kiểm soát huyết áp, giảm cân, ngủ tốt hơn…)
- **Ghi chú thêm:** 
```

**Trường bắt buộc:** Mã, Họ tên.
**Lưu ý:** Không ghi thông tin xét nghiệm hay sinh hiệu — đó là dữ liệu y tế trong collection `patients`, không phải hồ sơ tự khai. Chỉ ghi những gì bệnh nhân chia sẻ để cá nhân hoá tư vấn.

---

### Chuyên gia huấn luyện AI (CG00X)

```markdown
# Hồ sơ chuyên gia

- **Mã:** CG00X
- **Họ tên:** 
- **Chức danh:** (Chuyên gia huấn luyện AI / Chuyên gia quy trình / Chuyên gia dữ liệu y tế…)
- **Lĩnh vực chuyên môn:** (Prompt engineering, Quy trình lâm sàng, Chuẩn hoá dữ liệu…)
- **Mục tiêu huấn luyện:** (cải thiện chất lượng trả lời, chuẩn hoá ngôn ngữ y khoa, giảm hallucination…)
- **Phong cách prompt ưa dùng:** (few-shot, chain-of-thought, role-play, step-by-step…)
- **Ghi chú thêm:** (nền tảng kiến thức y khoa, kinh nghiệm với AI, mục tiêu dự án…)
```

**Trường bắt buộc:** Mã, Họ tên, Lĩnh vực chuyên môn.

---

## Nguyên tắc

- **Ổn định > cập nhật liên tục.** Không ghi lại mỗi lần bệnh nhân/bác sĩ nhắc đến bản thân — chỉ ghi khi thông tin có giá trị lâu dài.
- **Không suy đoán.** Nếu chưa biết chức danh hay chuyên môn, để trống hoặc hỏi, không điền từ mặc định.
- **Không trùng MEMORY / SOUL.** Sự kiện xảy ra → MEMORY. Preference về cách làm việc → SOUL. Danh tính / nghề nghiệp / sức khoẻ nền → USER.
- **Ghi đè toàn bộ.** `update_user_profile` không append — luôn truyền file đầy đủ sau khi merge.
