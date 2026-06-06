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
- **Nhúng dữ liệu thật** vào `const DATA = [...]` trong `<script>` — chỉ lấy field cần (examDate, vitals, diagnoses, medications, labResults). Đảo `records` về **cũ→mới** cho biểu đồ xu hướng.
- Thành phần: **header** (tên BN/khoa/số lần khám) · **thẻ tóm tắt** (lần gần nhất, chẩn đoán chính, số thuốc) · **biểu đồ xu hướng sinh hiệu** (huyết áp tâm thu / nhịp tim / SpO2 — đổi bằng nút bấm JS) · **timeline** từng lần khám (ngày + chẩn đoán + thuốc + lab bất thường tô đỏ).
- Màu nhã, nền nhạt, bo góc, có khoảng thở; chữ rõ; **tiếng Việt**; `max-width:100%` responsive. Lab `isAbnormal` → tô đỏ.
- Không bịa số — chỉ dùng dữ liệu trả về. Không có lịch sử (`count===0`) → báo gọn bằng chữ, không vẽ.

## Template (sao chép rồi thay phần `DATA` + tiêu đề)
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
  <div class="hd"><h1 id="ttl">Lịch sử khám</h1><p id="sub"></p></div>
  <div class="cards" id="sum"></div>
  <div class="panel"><h2>Xu hướng sinh hiệu</h2><div class="tabs" id="tabs"></div><svg id="chart" viewBox="0 0 800 240" width="100%" height="240"></svg></div>
  <div class="panel"><h2>Các lần khám</h2><div id="timeline"></div></div>
</div><script>
// THAY mảng DATA bằng dữ liệu thật (đảo cũ→mới). systolic suy từ bloodPressure "148/92".
const DATA = [
  {date:"2026-04-08",bp:"162/100",sys:162,hr:110,spo2:89,temp:37.2,dx:["Tăng huyết áp","Suy tim mất bù"],meds:["Amlodipine 5mg","Metformin 500mg"],labs:[{n:"NT-proBNP",v:4200,ab:true}]},
  {date:"2026-05-08",bp:"150/95",sys:150,hr:104,spo2:90,temp:37.0,dx:["Tăng huyết áp","Suy tim"],meds:["Amlodipine 5mg","Aspirin 81mg"],labs:[{n:"NT-proBNP",v:3300,ab:true}]},
  {date:"2026-06-04",bp:"148/92",sys:148,hr:102,spo2:91,temp:37.1,dx:["Tăng huyết áp","Nghi suy tim"],meds:["Amlodipine 5mg","Aspirin 81mg"],labs:[{n:"NT-proBNP",v:2840,ab:true}]},
];
const NAME="Nguyễn Văn Hùng", WARD="Nội Tim mạch";
document.getElementById("ttl").textContent="Lịch sử khám — "+NAME;
document.getElementById("sub").textContent=WARD+" · "+DATA.length+" lần khám";
const last=DATA[DATA.length-1]||{};
document.getElementById("sum").innerHTML=[
  ["Lần khám gần nhất",last.date||"—"],["Chẩn đoán chính",(last.dx||[])[0]||"—"],
  ["Số thuốc đang dùng",(last.meds||[]).length],["Huyết áp gần nhất",last.bp||"—"]
].map(c=>`<div class="card"><div class="lbl">${c[0]}</div><div class="val">${c[1]}</div></div>`).join("");
const METRICS={sys:["Huyết áp tâm thu","#dc2626"],hr:["Nhịp tim","#2563eb"],spo2:["SpO2","#16a34a"]};
let cur="sys";
const tabs=document.getElementById("tabs");
Object.keys(METRICS).forEach(k=>{const b=document.createElement("button");b.textContent=METRICS[k][0];b.onclick=()=>{cur=k;draw()};tabs.appendChild(b)});
function draw(){
  [...tabs.children].forEach((b,i)=>b.classList.toggle("on",Object.keys(METRICS)[i]===cur));
  const vals=DATA.map(d=>d[cur]),color=METRICS[cur][1],W=800,H=240,pad=40;
  const mn=Math.min(...vals)*0.95,mx=Math.max(...vals)*1.05||1;
  const x=i=>pad+i*(W-2*pad)/Math.max(1,DATA.length-1);
  const y=v=>H-pad-(v-mn)/(mx-mn)*(H-2*pad);
  let s=`<line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#cbd5e1"/>`;
  s+=`<polyline fill="none" stroke="${color}" stroke-width="3" points="${vals.map((v,i)=>x(i)+","+y(v)).join(" ")}"/>`;
  DATA.forEach((d,i)=>{s+=`<circle cx="${x(i)}" cy="${y(d[cur])}" r="5" fill="${color}"/>`+
    `<text x="${x(i)}" y="${y(d[cur])-12}" text-anchor="middle" font-size="13" font-weight="700" fill="${color}">${d[cur]}</text>`+
    `<text x="${x(i)}" y="${H-pad+18}" text-anchor="middle" font-size="12" fill="#64748b">${d.date.slice(5)}</text>`});
  document.getElementById("chart").innerHTML=s;
}
document.getElementById("timeline").innerHTML=[...DATA].reverse().map(d=>
  `<div class="visit"><div class="d">${d.date}</div><div class="sub">HA ${d.bp} · Nhịp ${d.hr} · SpO2 ${d.spo2}%</div>`+
  d.dx.map(x=>`<span class="tag">${x}</span>`).join("")+
  (d.labs||[]).map(l=>`<span class="tag ${l.ab?"warn":""}">${l.n}: ${l.v}</span>`).join("")+
  `<div style="margin-top:6px;color:#475569">💊 ${(d.meds||[]).join(", ")||"—"}</div></div>`).join("");
draw();
</script></body></html>
`````

## Badcase
- **Chưa chọn bệnh nhân:** đọc panel không thấy hồ sơ chi tiết → bảo bác sĩ chọn một bệnh nhân ở tab Bệnh nhân trước, rồi thử lại.
- **Không có lịch sử (`count===0`):** báo gọn "Bệnh nhân chưa có lịch sử khám nào được ghi nhận", không vẽ dashboard rỗng.
- **Bác sĩ chỉ hỏi 1 con số cụ thể** (vd "lần trước huyết áp bao nhiêu"): trả lời thẳng bằng chữ, không cần vẽ cả dashboard.
