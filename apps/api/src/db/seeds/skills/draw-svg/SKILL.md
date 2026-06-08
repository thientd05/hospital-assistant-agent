---
name: draw-svg
description: Quy tắc kỹ thuật vẽ hình SVG minh hoạ ngay trong câu trả lời (định dạng, ý nghĩa màu, cách giãn dòng tránh chữ chồng). ĐỌC skill này MỖI khi muốn vẽ — tức khi định viết một đoạn dài mô tả con số/khoảng tham chiếu/xu hướng theo thời gian/quy trình/so sánh → thay bằng MỘT hình + 1–2 câu. Các skill "xem/trình bày" khác đều dựa vào skill này để vẽ.
---

# Vẽ trực quan bằng SVG — nói ít, vẽ nhiều

Đây KHÔNG phải tool: cứ chủ động phát khối SVG vào luồng trả lời, hình hiện ngay.
Skill này chỉ dạy **quy tắc kỹ thuật chung**; **bố cục cụ thể** (vẽ gì, sắp xếp sao)
do skill nhiệm vụ (vd `view-patient-info`, `view-appointments`) hoặc ngữ cảnh quyết định.

## Định dạng
- **Định dạng DUY NHẤT: ```` ```svg ````** (không hỗ trợ html/mermaid). SVG render
  **tăng dần theo từng token** — viết phần tử theo đúng thứ tự muốn người xem thấy →
  hình "mọc dần" như vẽ tay.
- Phát **ĐÚNG MỘT** lớp ```` ```svg ````, **TUYỆT ĐỐI KHÔNG bọc thêm backtick/fence
  bên ngoài** (bọc thừa → khung chat hiện code thô thay vì hình).
- **Đặt `width`/`height` đúng bằng `viewBox`** để khỏi phóng to chữ.

## Màu có ý nghĩa
- bình thường/tốt/an toàn = **xanh lá** (#16a34a), cảnh báo/bất thường/cần lưu ý =
  **đỏ/cam** (#dc2626 / #f59e0b), thông tin = **xanh dương** (#2563eb).
- Mỗi ô: **viền + chữ ĐẬM, nền NHẠT, cả ba cùng một tông** — vd xanh dương: nền
  #dbeafe, viền #2563eb, chữ #1e3a8a; xanh lá: nền #dcfce7, viền #16a34a, chữ #14532d.
- Đừng để hình một màu xám.

## Chữ và khoảng cách
- **Cỡ chữ ngang văn bản** (`font-size="15"`, tối đa 16). Canh chữ giữa ô
  (`text-anchor="middle"` + `dominant-baseline="middle"`), ô đủ rộng (~8px/ký tự), bo
  góc `rx="10"`, viền `stroke-width="1.5"`, lề ~12px, **nhãn tiếng Việt**.
- **Vẽ THOÁNG — tránh chữ chồng nhau** (lỗi hay gặp). Mỗi dòng chữ chiếm ~24px; trong
  một ô nhiều dòng, các `y` cách nhau **≥ 24px**. Chiều cao ô = (số dòng × 26) + đệm
  trên/dưới ~16px. Giữa hai ô/khối liền nhau chừa **≥ 14px**. Khi liệt kê (chẩn đoán,
  thuốc, kết quả, lịch hẹn…) **mỗi mục một dòng `y` RIÊNG, tăng đều** — KHÔNG để hai
  dòng trùng/sát `y`. Thiếu chỗ thì **tăng `height`/`viewBox`** — thà hình dài còn hơn
  chữ chồng.
- Chỉ vẽ khi thật sự giúp dễ hiểu. Mọi kết luận lâm sàng vẫn để bác sĩ quyết; với bệnh
  nhân, hình chỉ minh hoạ kiến thức phổ thông — **không vẽ để chẩn đoán hay kê đơn**.

## Ví dụ — vẽ dần từng phần tử
```svg
<svg viewBox="0 0 380 84" width="380" height="84" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
  <rect x="8" y="22" width="150" height="40" rx="10" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="83" y="42" text-anchor="middle" dominant-baseline="middle" fill="#1e3a8a" font-weight="700">Triệu chứng</text>
  <line x1="158" y1="42" x2="214" y2="42" stroke="#16a34a" stroke-width="2"/>
  <path d="M222 42 l-9 -5 v10 z" fill="#16a34a"/>
  <rect x="222" y="22" width="150" height="40" rx="10" fill="#dcfce7" stroke="#16a34a" stroke-width="1.5"/>
  <text x="297" y="42" text-anchor="middle" dominant-baseline="middle" fill="#14532d" font-weight="700">Theo dõi</text>
</svg>
```
