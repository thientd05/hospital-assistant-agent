---
name: manager-check-in
description: Menu lựa chọn các chức năng quản lý (xem thống kê, danh sách, chi tiết, thêm/sửa/xóa) tùy theo nhu cầu của quản lý trong phiên làm việc.
---

# Skill: manager-check-in — Menu quản lý toàn diện

## Mục đích

Cung cấp menu tập trung các chức năng quản lý hệ thống bệnh viện, giúp quản lý dễ dàng truy cập thống kê, danh sách, chi tiết nhân sự và hoạt động. Skill này là điểm khởi động cho mỗi phiên làm việc của quản lý.

## Khi nào dùng skill này

- **Đầu tiên trong mỗi phiên làm việc:** Khi quản lý gửi tin nhắn đầu tiên, agent sẽ đọc skill này để nắm menu các chức năng khả dụng.
- **Không đọc lại trong cùng phiên:** Sau tin nhắn đầu tiên, nếu quản lý yêu cầu chức năng khác, agent gọi tool tương ứng mà không cần đọc lại skill.

## Menu chức năng

### 📊 Thống kê (Ưu tiên)

Quản lý thường kiểm tra **thống kê tài chính** trước tiên, sau đó các thống kê khác tùy nhu cầu:

1. **Thống kê tài chính** — Xem doanh thu, chi phí, lợi nhuận, xu hướng tài chính
   - Tool: `get_financial_stats` *(chưa có sẵn, sẽ bổ sung sau)*

2. **Thống kê khách hàng** — Xem số lượng bệnh nhân, xu hướng tăng/giảm
   - Tool: `get_customer_stats` ✅ (sẵn sàng)

3. **Thống kê bác sĩ** — Xem hiệu suất, số ca điều trị, tỷ lệ thành công
   - Tool: `get_doctor_stats` *(chưa có sẵn, sẽ bổ sung sau)*

4. **Thống kê chuyên gia** — Xem hoạt động, số lượt tư vấn, mức độ tương tác
   - Tool: `get_expert_stats` *(chưa có sẵn, sẽ bổ sung sau)*

### 👥 Danh sách và Chi tiết

1. **Danh sách bệnh nhân**
   - Tool: `list_patients` ✅ (sẵn sàng)

2. **Danh sách bác sĩ**
   - Tool: `list_doctors` *(chưa có sẵn, sẽ bổ sung sau)*

3. **Danh sách chuyên gia**
   - Tool: `list_experts` *(chưa có sẵn, sẽ bổ sung sau)*

4. **Chi tiết bác sĩ** — Xem thông tin, lịch làm việc, các ca điều trị
   - Tool: `get_doctor_detail` *(chưa có sẵn, sẽ bổ sung sau)*

5. **Chi tiết chuyên gia** — Xem thông tin, skill, hoạt động gần đây
   - Tool: `get_expert_detail` *(chưa có sẵn, sẽ bổ sung sau)*

6. **Danh sách trò chuyện** — Xem lịch sử các cuộc trò chuyện (quản lý hoặc bệnh nhân với chatbot)
   - Tool: `list_conversations` *(chưa có sẵn, sẽ bổ sung sau)*

7. **Chi tiết trò chuyện** — Xem nội dung chi tiết, transcript của một trò chuyện
   - Tool: `get_conversation_detail` *(chưa có sẵn, sẽ bổ sung sau)*

### ➕ Quản lý Nhân sự (Chưa khả dụng)

Những hành động này sẽ được bổ sung tool sau:

- **Thêm bác sĩ** → Tool: `create_doctor` *(chưa có sẵn)*
- **Sửa bác sĩ** → Tool: `update_doctor` *(chưa có sẵn)*
- **Xóa bác sĩ** → Tool: `delete_doctor` *(chưa có sẵn)*
- **Thêm chuyên gia** → Tool: `create_expert` *(chưa có sẵn)*
- **Sửa chuyên gia** → Tool: `update_expert` *(chưa có sẵn)*
- **Xóa chuyên gia** → Tool: `delete_expert` *(chưa có sẵn)*

## Quy trình

1. **Đầu tiên trong phiên:** Agent đọc skill này, trình bày menu và thống kê ưu tiên (tài chính trước).
2. **Tùy nhu cầu quản lý:** Quản lý nói muốn gì, agent gọi tool tương ứng.
3. **Tool chưa sẵn:** Nếu quản lý yêu cầu chức năng chưa có tool, agent thẳng thắn nói "Tool này chưa sẵn sàng, sẽ bổ sung sau" — **KHÔNG bịa đặt dữ liệu hoặc ngoại suy**.
4. **Lặp:** Quản lý có thể yêu cầu nhiều chức năng khác nhau trong cùng một phiên, agent gọi tool từng cái.

## Nguyên tắc

- **Linh hoạt menu:** Không ép quản lý theo thứ tự cố định — quản lý muốn xem cái gì thì xem.
- **Ưu tiên tài chính:** Khi trình bày menu, nhắc quản lý rằng thống kê tài chính thường được xem trước.
- **Thẳng thắn về tool chưa sẵn:** Nếu quản lý gọi tool chưa tồn tại, nói rõ "Tôi chưa có tool này để sử dụng. Vui lòng chờ bộ phận IT bổ sung."
- **Không bịa:** Cấm tạo dữ liệu giả, ngoại suy, hoặc giả vờ gọi tool khi thực tế không có.
