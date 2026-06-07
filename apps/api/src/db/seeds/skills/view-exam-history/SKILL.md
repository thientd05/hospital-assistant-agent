---
name: view-exam-history
description: Xem lại LỊCH SỬ KHÁM / diễn tiến / quá trình điều trị của bệnh nhân và vẽ DASHBOARD trực quan. Dùng khi bác sĩ nói "xem lịch sử khám", "diễn tiến bệnh", "các lần khám trước", "quá trình điều trị", "huyết áp thay đổi thế nào".
---

# Dashboard lịch sử khám

Mục tiêu: lấy lịch sử khám của bệnh nhân rồi **dựng một dashboard HTML xịn** (như Claude web) để bác sĩ xem trực quan diễn tiến — thay vì liệt kê dài dòng bằng chữ.

## Chuỗi lệnh
1. `read_panel({ tab: "patients" })` → tìm **mã bệnh nhân đang chọn** (hồ sơ chi tiết / ref `patient:<id>:open`). Chưa chọn BN → bảo bác sĩ chọn trước (xem Badcase).
2. `read_exam_history({ patientId: "<id>" })` → nhận `{ patientId, count, records: [...] }`. `records` sắp **mới nhất trước**; mỗi record có `examDate, doctorName, ward, diagnoses[], medications[{name,instruction}], vitals{spO2,heartRate,bloodPressure,temperature}, labResults[{name,value,unit,referenceRange,isAbnormal}]`.
3. **Xuất MỘT khối ```html```** chứa trang dashboard tự-chứa (HTML+CSS+JS inline, **KHÔNG CDN ngoài**). FE render trong iframe cô lập → có thể dùng JS tương tác. Trả lời chữ chỉ 1 câu ngắn ("Đây là tổng quan các lần khám của bác …"), phần còn lại để dashboard nói.

## Nguyên tắc dashboard (bám theo template dưới)
- **QUAN TRỌNG — viết NỘI DUNG bằng HTML TĨNH, KHÔNG dựng bằng JS.** Header (tên/khoa/số lần), các **thẻ tóm tắt** (điền sẵn giá trị thật), và **timeline từng lần khám** phải nằm thẳng trong HTML với dữ liệu đã điền — để dashboard **vẽ dần realtime** khi stream (chữ/box hiện tới đâu thấy tới đó). KHÔNG để `<div id=...>` rỗng rồi `innerHTML` bằng JS — làm vậy nội dung sẽ "bụp" ra cùng lúc ở cuối.
- **Đồ thị cũng vẽ dần:** vẽ **SVG TĨNH** cho chỉ số mặc định (huyết áp tâm thu) + 3 **nút TĨNH** ngay trong markup → hiện dần khi stream. Toạ độ tính theo đúng công thức trong `draw()`: `pad=40,W=800,H=240`; `mn=min(sys)*0.95, mx=max(sys)*1.05`; `x_i=40+i*720/(n-1)`; `y=200-(v-mn)/(mx-mn)*160`; nhãn số ở `y-12`, nhãn ngày ở `y=218`. `<script>` ở cuối CHỈ gắn `onclick` cho nút + gọi `draw()` (chuẩn hoá lại + cho đổi chỉ số); chứa `const S=[...]` (`{date,sys,hr,spo2}`, cũ→mới). **Nút chưa bấm được tới khi gen xong** (script chạy ở cuối) — đúng mong muốn.
- Thành phần: **header** · **thẻ tóm tắt** (lần gần nhất, chẩn đoán chính, số thuốc, HA gần nhất) · **biểu đồ xu hướng** (sys/nhịp/SpO2 đổi bằng nút) · **timeline** mỗi lần khám (ngày + chẩn đoán + thuốc + lab bất thường tô đỏ), sắp **mới→cũ**.
- Màu nhã, nền nhạt, bo góc, có khoảng thở; chữ rõ; **tiếng Việt**; `max-width:100%` responsive. Lab `isAbnormal` → class `tag warn` (đỏ).
- Không bịa số — chỉ dùng dữ liệu trả về. Không có lịch sử (`count===0`) → báo gọn bằng chữ, không vẽ.

## Template (sao chép, thay text/thẻ/visit bằng dữ liệu thật; trong script chỉ thay `S`)
`````html
<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  body{background:#f1f5f9;color:#0f172a;padding:16px;font-size:14px}
  .wrap{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
  .hd{background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;border-radius:14px;padding:18px 20px}
  .hd h1{font-size:20px;font-weight:700}.hd p{opacity:.9;margin-top:4px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
  .card .lbl{font-size:12px;color:#64748b}.card .val{font-size:18px;font-weight:700;margin-top:4px;color:#1e3a8a}
  .panel{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
  .panel h2{font-size:15px;font-weight:700;margin-bottom:10px;color:#0f172a}
  .tabs{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
  .tabs button{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:5px 12px;cursor:pointer;font-size:13px}
  .tabs button.on{background:#2563eb;color:#fff;border-color:#2563eb}
  .visit{border-left:3px solid #2563eb;padding:8px 0 8px 14px;margin-bottom:12px}
  .visit .d{font-weight:700;color:#1e3a8a}.visit .sub{color:#64748b;font-size:12px;margin-bottom:6px}
  .tag{display:inline-block;background:#dbeafe;color:#1e3a8a;border-radius:6px;padding:2px 8px;margin:2px 4px 2px 0;font-size:12px}
  .tag.warn{background:#fee2e2;color:#991b1b}
</style></head><body><div class="wrap">
  <!-- HEADER tĩnh -->
  <div class="hd"><h1>Lịch sử khám — Nguyễn Văn Hùng</h1><p>Nội Tim mạch · 3 lần khám</p></div>
  <!-- THẺ TÓM TẮT tĩnh (điền giá trị thật của lần gần nhất) -->
  <div class="cards">
    <div class="card"><div class="lbl">Lần khám gần nhất</div><div class="val">2026-06-04</div></div>
    <div class="card"><div class="lbl">Chẩn đoán chính</div><div class="val">Tăng huyết áp</div></div>
    <div class="card"><div class="lbl">Số thuốc đang dùng</div><div class="val">2</div></div>
    <div class="card"><div class="lbl">Huyết áp gần nhất</div><div class="val">148/92</div></div>
  </div>
  <!-- BIỂU ĐỒ: SVG TĨNH (mặc định sys) + nút TĨNH → vẽ dần; script gắn tương tác ở cuối -->
  <div class="panel"><h2>Xu hướng sinh hiệu</h2>
    <div class="tabs" id="tabs"><button class="on">Huyết áp tâm thu</button><button>Nhịp tim</button><button>SpO2</button></div>
    <svg id="chart" viewBox="0 0 800 240" width="100%" height="240">
      <line x1="40" y1="200" x2="760" y2="200" stroke="#cbd5e1"/>
      <polyline fill="none" stroke="#dc2626" stroke-width="3" points="40,84 400,149 760,160"/>
      <circle cx="40" cy="84" r="5" fill="#dc2626"/><text x="40" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#dc2626">162</text><text x="40" y="218" text-anchor="middle" font-size="12" fill="#64748b">04-08</text>
      <circle cx="400" cy="149" r="5" fill="#dc2626"/><text x="400" y="137" text-anchor="middle" font-size="13" font-weight="700" fill="#dc2626">150</text><text x="400" y="218" text-anchor="middle" font-size="12" fill="#64748b">05-08</text>
      <circle cx="760" cy="160" r="5" fill="#dc2626"/><text x="760" y="148" text-anchor="middle" font-size="13" font-weight="700" fill="#dc2626">148</text><text x="760" y="218" text-anchor="middle" font-size="12" fill="#64748b">06-04</text>
    </svg></div>
  <!-- TIMELINE tĩnh: mỗi lần khám một .visit, sắp mới→cũ; lab bất thường thêm class warn -->
  <div class="panel"><h2>Các lần khám</h2>
    <div class="visit"><div class="d">2026-06-04</div><div class="sub">HA 148/92 · Nhịp 102 · SpO2 91%</div>
      <span class="tag">Tăng huyết áp</span><span class="tag">Nghi suy tim</span><span class="tag warn">NT-proBNP: 2840</span>
      <div style="margin-top:6px;color:#475569">💊 Amlodipine 5mg, Aspirin 81mg</div></div>
    <div class="visit"><div class="d">2026-05-08</div><div class="sub">HA 150/95 · Nhịp 104 · SpO2 90%</div>
      <span class="tag">Tăng huyết áp</span><span class="tag">Suy tim</span><span class="tag warn">NT-proBNP: 3300</span>
      <div style="margin-top:6px;color:#475569">💊 Amlodipine 5mg, Aspirin 81mg</div></div>
    <div class="visit"><div class="d">2026-04-08</div><div class="sub">HA 162/100 · Nhịp 110 · SpO2 89%</div>
      <span class="tag">Tăng huyết áp</span><span class="tag">Suy tim mất bù</span><span class="tag warn">NT-proBNP: 4200</span>
      <div style="margin-top:6px;color:#475569">💊 Amlodipine 5mg, Metformin 500mg</div></div>
  </div>
</div><script>
// Script CHỈ gắn tương tác cho biểu đồ → nút bấm được SAU khi gen xong (script chạy ở cuối).
// S = chuỗi sinh hiệu thật (cũ→mới); sys suy từ HA "148/92". draw() chuẩn hoá lại SVG tĩnh.
const S=[{date:"2026-04-08",sys:162,hr:110,spo2:89},{date:"2026-05-08",sys:150,hr:104,spo2:90},{date:"2026-06-04",sys:148,hr:102,spo2:91}];
const METRICS={sys:["Huyết áp tâm thu","#dc2626"],hr:["Nhịp tim","#2563eb"],spo2:["SpO2","#16a34a"]};
const keys=Object.keys(METRICS); let cur="sys";
const tabs=document.getElementById("tabs");
[...tabs.children].forEach((b,i)=>{b.onclick=()=>{cur=keys[i];draw()}});
function draw(){
  [...tabs.children].forEach((b,i)=>b.classList.toggle("on",keys[i]===cur));
  const vals=S.map(d=>d[cur]),color=METRICS[cur][1],W=800,H=240,pad=40;
  const mn=Math.min(...vals)*0.95,mx=Math.max(...vals)*1.05||1;
  const x=i=>pad+i*(W-2*pad)/Math.max(1,S.length-1);
  const y=v=>H-pad-(v-mn)/(mx-mn)*(H-2*pad);
  let s=`<line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#cbd5e1"/>`;
  s+=`<polyline fill="none" stroke="${color}" stroke-width="3" points="${vals.map((v,i)=>x(i)+","+y(v)).join(" ")}"/>`;
  S.forEach((d,i)=>{s+=`<circle cx="${x(i)}" cy="${y(d[cur])}" r="5" fill="${color}"/>`+
    `<text x="${x(i)}" y="${y(d[cur])-12}" text-anchor="middle" font-size="13" font-weight="700" fill="${color}">${d[cur]}</text>`+
    `<text x="${x(i)}" y="${H-pad+18}" text-anchor="middle" font-size="12" fill="#64748b">${d.date.slice(5)}</text>`});
  document.getElementById("chart").innerHTML=s;
}
draw();
</script></body></html>
`````

## Badcase
- **Chưa chọn bệnh nhân:** đọc panel không thấy hồ sơ chi tiết → bảo bác sĩ chọn một bệnh nhân ở tab Bệnh nhân trước, rồi thử lại.
- **Không có lịch sử (`count===0`):** báo gọn "Bệnh nhân chưa có lịch sử khám nào được ghi nhận", không vẽ dashboard rỗng.
- **Bác sĩ chỉ hỏi 1 con số cụ thể** (vd "lần trước huyết áp bao nhiêu"): trả lời thẳng bằng chữ, không cần vẽ cả dashboard.
