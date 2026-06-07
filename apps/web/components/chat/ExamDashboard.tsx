"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { ExamRecord } from "@pr_hospitalagent/types";
import { useExamHistory } from "@/hooks/useExamHistory";

// Artifact dashboard lịch sử khám. Agent KHÔNG tự gõ HTML — chỉ phát một khối
// ```exam-dashboard``` chứa {patientId, patientName} (như gọi tool). Component này
// tự lấy lịch sử khám qua REST (useExamHistory) rồi DỰNG dashboard cố định và
// REVEAL DẦN từng phần (mô phỏng "agent đang gen"). Skill nhờ vậy còn vài dòng,
// token sinh ra ~0 dù bác sĩ hỏi lại bao nhiêu lần.

// ====== TỐC ĐỘ "FAKE GEN" CỦA DASHBOARD — chỉnh ở đây ======
// Mỗi mốc nội dung (header → tab → từng thẻ → từng biểu đồ → từng lần khám) hiện
// cách nhau REVEAL_STEP_MS mili-giây. NHỎ hơn = gen NHANH hơn. Đặt 0 = hiện tức thì
// (tắt hiệu ứng). Vd: 40 = rất nhanh, 75 = mặc định, 150 = chậm rãi.
const REVEAL_STEP_MS = 500;
// Số mốc tối đa cần lộ (đủ phủ mọi phần; không cần đổi trừ khi BN có > ~20 lần khám).
const REVEAL_MAX_STEP = 40;

type Props = { patientId: string; patientName?: string };

const shortDate = (d: string) => (d.length >= 10 ? d.slice(5) : d);

// ---- Mini line chart (SVG string) — đa chuỗi, vùng tham chiếu, nhãn căn mép ----
type Series = { name: string; color: string; vals: (number | null)[] };
type ChartOpts = { ref?: { low?: number; high?: number }; abnormal?: boolean[] };

function lineChart(series: Series[], dates: string[], opts: ChartOpts = {}): string {
  const W = 300, H = 178, L = 44, R = 18, T = 18, B = 28, IN = 16;
  const iw = W - L - R, ih = H - T - B, innerW = iw - 2 * IN;
  const vals: number[] = [];
  series.forEach((s) => s.vals.forEach((v) => v != null && vals.push(v)));
  if (opts.ref?.low != null) vals.push(opts.ref.low);
  if (opts.ref?.high != null) vals.push(opts.ref.high);
  if (vals.length === 0) return "";
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.12; mn -= pad; mx += pad;
  const n = dates.length;
  const X = (i: number) => (n === 1 ? L + iw / 2 : L + IN + (i * innerW) / (n - 1));
  const Y = (v: number) => T + ih - ((v - mn) / (mx - mn)) * ih;

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">`;

  if (opts.ref?.low != null && opts.ref?.high != null) {
    const y1 = Y(opts.ref.high), y2 = Y(opts.ref.low);
    svg += `<rect x="${L}" y="${y1}" width="${iw}" height="${Math.max(0, y2 - y1)}" fill="#dcfce7" opacity=".55"/>`;
  } else if (opts.ref?.high != null) {
    const yh = Y(opts.ref.high);
    svg += `<line x1="${L}" y1="${yh}" x2="${W - R}" y2="${yh}" stroke="#86efac" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  } else if (opts.ref?.low != null) {
    const yl = Y(opts.ref.low);
    svg += `<line x1="${L}" y1="${yl}" x2="${W - R}" y2="${yl}" stroke="#86efac" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  }

  for (let g = 0; g <= 2; g++) {
    const v = mn + ((mx - mn) * g) / 2, y = Y(v);
    svg += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" stroke="#eef2f7"/>`;
    svg += `<text x="${L - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#94a3b8">${+v.toFixed(v < 10 ? 1 : 0)}</text>`;
  }
  svg += `<line x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}" stroke="#cbd5e1"/>`;

  series.forEach((s) => {
    const pts = s.vals.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean).join(" ");
    svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>`;
    s.vals.forEach((v, i) => {
      if (v == null) return;
      const ab = opts.abnormal ? opts.abnormal[i] : false;
      const col = ab ? "#dc2626" : s.color;
      const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
      const tx = i === 0 ? X(i) - 3 : i === n - 1 ? X(i) + 3 : X(i);
      svg += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${col}"/>`;
      svg += `<text x="${tx}" y="${Y(v) - 9}" text-anchor="${anchor}" font-size="10" font-weight="700" fill="${col}">${v}</text>`;
    });
  });

  dates.forEach((d, i) => {
    svg += `<text x="${X(i)}" y="${H - 9}" text-anchor="middle" font-size="9" fill="#94a3b8">${shortDate(d)}</text>`;
  });

  return svg + `</svg>`;
}

type Flag = { bad: boolean; text: string } | null;
function trendFlag(asc: (number | null)[], betterWhenDown: boolean): Flag {
  const clean = asc.filter((v): v is number => v != null);
  if (clean.length < 2) return null;
  const first = clean[0], last = clean[clean.length - 1];
  if (first === last) return null;
  const down = last < first;
  const improved = betterWhenDown ? down : !down;
  const pct = Math.round((Math.abs(last - first) / Math.abs(first)) * 100);
  return { bad: !improved, text: `${down ? "Giảm" : "Tăng"} ${pct}% so với lần đầu — ${improved ? "cải thiện" : "xấu đi"}` };
}

// "<125" | "0.7–1.3" | "0.7-1.3" | ">5" → {low?, high?}
function parseRef(s: string | undefined): { low?: number; high?: number } | undefined {
  if (!s) return undefined;
  const t = s.replace(/,/g, ".").trim();
  let m = t.match(/^[<≤]\s*([\d.]+)/);
  if (m) return { high: +m[1] };
  m = t.match(/^[>≥]\s*([\d.]+)/);
  if (m) return { low: +m[1] };
  m = t.match(/([\d.]+)\s*[–\-—]\s*([\d.]+)/);
  if (m) return { low: +m[1], high: +m[2] };
  return undefined;
}

function ChartCard({ title, unit, svg, flag, legend, style }: {
  title: string; unit: string; svg: string; flag: Flag;
  legend?: { name: string; color: string }[]; style: React.CSSProperties;
}) {
  return (
    <div className="chart-card" style={style}>
      <h3><span>{title}</span><span className="u">{unit}</span></h3>
      {flag && <div className={`flag ${flag.bad ? "bad" : "ok"}`}>{flag.text}</div>}
      {legend && (
        <div className="legend">
          {legend.map((s) => (
            <span className="lg" key={s.name}><i style={{ background: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

function ExamDashboardInner({ patientId, patientName }: Props) {
  const { data, loading, error } = useExamHistory(patientId, 0, true);
  const [tab, setTab] = useState<"overview" | "charts" | "timeline">("overview");
  const [step, setStep] = useState(0);

  // Chữ ký NỘI DUNG của data — đổi khi và chỉ khi nội dung thực sự khác. useResource
  // revalidate nền trả về object MỚI dù nội dung y hệt; nếu phụ thuộc thẳng vào `data`
  // thì hiệu ứng reveal bị reset giữa chừng (giật, render lại từ đầu). Dùng chữ ký này
  // làm dependency → revalidate trùng nội dung KHÔNG khởi động lại animation.
  const dataSig = data
    ? `${data.patientId}:${data.count}:${data.records
        .map((r) => `${r.id}@${String(r.updatedAt)}`)
        .join(",")}`
    : null;

  // Reveal dần từng phần khi data về (mô phỏng agent gen): tăng `step` đều tay theo
  // REVEAL_STEP_MS. REVEAL_STEP_MS=0 → hiện ngay tức thì (bỏ hiệu ứng).
  useEffect(() => {
    if (!dataSig) return;
    if (REVEAL_STEP_MS <= 0) {
      setStep(REVEAL_MAX_STEP + 1);
      return;
    }
    setStep(0);
    let s = 0;
    const id = setInterval(() => {
      s += 1;
      setStep(s);
      if (s > REVEAL_MAX_STEP) clearInterval(id);
    }, REVEAL_STEP_MS);
    return () => clearInterval(id);
  }, [dataSig]);

  // opacity/transform theo ngưỡng reveal k
  const rv = (k: number): React.CSSProperties => ({
    opacity: step >= k ? 1 : 0,
    transform: step >= k ? "none" : "translateY(5px)",
    transition: "opacity .3s ease, transform .3s ease",
  });

  const model = useMemo(() => {
    if (!data || data.records.length === 0) return null;
    const records = data.records; // mới → cũ
    const asc = [...records].slice().reverse(); // cũ → mới
    const dates = asc.map((r) => r.day);
    const latest = records[0];

    const sys = asc.map((r) => +String(r.vitals.bloodPressure).split("/")[0] || 0);
    const dia = asc.map((r) => +String(r.vitals.bloodPressure).split("/")[1] || 0);
    const hr = asc.map((r) => r.vitals.heartRate);
    const spo = asc.map((r) => r.vitals.spO2);
    const temp = asc.map((r) => r.vitals.temperature);

    const labNames = [...new Set(records.flatMap((r) => r.labResults.map((l) => l.name)))];

    return { records, asc, dates, latest, sys, dia, hr, spo, temp, labNames };
  }, [data]);

  if (loading) {
    return <div className="exam-dash"><div className="panel" style={{ color: "#64748b" }}>Đang tải lịch sử khám…</div></div>;
  }
  if (error) {
    return <div className="exam-dash"><div className="panel" style={{ color: "#b91c1c" }}>Không tải được lịch sử khám: {error}</div></div>;
  }
  if (!model) {
    return <div className="exam-dash"><div className="panel" style={{ color: "#64748b" }}>Bệnh nhân chưa có lịch sử khám nào được ghi nhận.</div></div>;
  }

  const { records, asc, dates, latest, sys, dia, hr, spo, temp, labNames } = model;
  const name = patientName || patientId;
  const abnLatest = latest.labResults.filter((l) => l.isAbnormal).map((l) => l.name);

  const ovCards: [string, React.ReactNode, string, boolean][] = [
    ["Lần khám gần nhất", latest.day, latest.doctorName, false],
    ["Chẩn đoán chính", latest.diagnoses[0] ?? "—", latest.diagnoses.slice(1).join(", "), false],
    ["Số thuốc đang dùng", latest.medications.length, latest.medications.map((m) => m.name.split(" ")[0]).join(", "), false],
    ["Huyết áp gần nhất", latest.vitals.bloodPressure, "mmHg", true],
    ["Nhịp tim", latest.vitals.heartRate, "lần/phút", latest.vitals.heartRate > 100],
    ["SpO₂", `${latest.vitals.spO2}%`, "", latest.vitals.spO2 < 95],
  ];

  const vitalCharts = [
    { node: <ChartCard key="bp" title="Huyết áp" unit="mmHg" style={rv(10)}
        svg={lineChart([{ name: "Tâm thu", color: "#dc2626", vals: sys }, { name: "Tâm trương", color: "#f59e0b", vals: dia }], dates, { ref: { high: 140 } })}
        flag={trendFlag(sys, true)} legend={[{ name: "Tâm thu", color: "#dc2626" }, { name: "Tâm trương", color: "#f59e0b" }]} /> },
    { node: <ChartCard key="hr" title="Nhịp tim" unit="lần/phút" style={rv(11)}
        svg={lineChart([{ name: "HR", color: "#087e8b", vals: hr }], dates, { ref: { low: 60, high: 100 }, abnormal: hr.map((v) => v > 100) })}
        flag={trendFlag(hr, true)} /> },
    { node: <ChartCard key="spo" title="SpO₂" unit="%" style={rv(12)}
        svg={lineChart([{ name: "SpO2", color: "#0891b2", vals: spo }], dates, { ref: { low: 95 }, abnormal: spo.map((v) => v < 95) })}
        flag={trendFlag(spo, false)} /> },
    { node: <ChartCard key="temp" title="Nhiệt độ" unit="°C" style={rv(13)}
        svg={lineChart([{ name: "Temp", color: "#7c3aed", vals: temp }], dates, { ref: { low: 36, high: 37.5 } })}
        flag={trendFlag(temp, true)} /> },
  ];

  const labCharts = labNames.map((nm, idx) => {
    const series = asc.map((r) => {
      const l = r.labResults.find((x) => x.name === nm);
      return l && typeof l.value === "number" ? l.value : null;
    });
    const abn = asc.map((r) => !!r.labResults.find((x) => x.name === nm)?.isAbnormal);
    const sample = records.flatMap((r) => r.labResults).find((l) => l.name === nm);
    const unit = sample?.unit ?? "";
    const ref = parseRef(sample?.referenceRange);
    const colors = ["#dc2626", "#ea580c", "#9333ea", "#0891b2", "#16a34a", "#db2777"];
    return (
      <ChartCard key={nm} title={nm} unit={unit} style={rv(14 + idx)}
        svg={lineChart([{ name: nm, color: colors[idx % colors.length], vals: series }], dates, { ref, abnormal: abn })}
        flag={trendFlag(series, true)} />
    );
  });

  const npro = asc.map((r) => r.labResults.find((l) => l.name === "NT-proBNP")?.value).filter((v): v is number => typeof v === "number");

  return (
    <div className="exam-dash">
      <div className="hd" style={rv(0)}>
        <h1>Lịch sử khám — {name} ({patientId})</h1>
        <p>{latest.ward || "—"} · {records.length} lần khám · {dates[0]} → {dates[dates.length - 1]}</p>
      </div>

      <div className="nav" style={rv(1)}>
        <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>Tổng quan</button>
        <button className={tab === "charts" ? "on" : ""} onClick={() => setTab("charts")}>Đồ thị</button>
        <button className={tab === "timeline" ? "on" : ""} onClick={() => setTab("timeline")}>Timeline</button>
      </div>

      {tab === "overview" && (
        <>
          <div className="cards">
            {ovCards.map(([l, v, s, w], i) => (
              <div className="card" key={l} style={rv(2 + i)}>
                <div className="lbl">{l}</div>
                <div className={`val ${w ? "warn" : ""}`}>{v}</div>
                {s ? <div className="sub">{s}</div> : null}
              </div>
            ))}
          </div>
          <div className="panel" style={rv(8)}>
            <h2>Diễn tiến nổi bật</h2>
            <div className="desc">
              Bệnh nhân <b>{name}</b> theo dõi <b>{latest.diagnoses.join(", ") || "—"}</b>.{" "}
              {npro.length >= 2 && (
                <>NT-proBNP diễn tiến {npro.join(" → ")} pg/mL ({npro[npro.length - 1] < npro[0] ? "đang giảm, xu hướng cải thiện" : "đang tăng"}) nhưng vẫn cao hơn ngưỡng.{" "}</>
              )}
              Hiện còn <b>{abnLatest.length}</b> chỉ số xét nghiệm bất thường{abnLatest.length ? `: ${abnLatest.join(", ")}` : ""}.
            </div>
          </div>
        </>
      )}

      {tab === "charts" && (
        <>
          <div className="panel">
            <h2>Sinh hiệu</h2>
            <div className="desc">Xu hướng các chỉ số sinh hiệu qua từng lần khám.</div>
            <div className="chart-grid">{vitalCharts.map((c) => c.node)}</div>
          </div>
          <div className="panel">
            <h2>Xét nghiệm</h2>
            <div className="desc">Vùng tô nhạt là khoảng tham chiếu; điểm đỏ là bất thường.</div>
            <div className="chart-grid">{labCharts}</div>
          </div>
        </>
      )}

      {tab === "timeline" && (
        <div className="panel">
          <h2>Các lần khám</h2>
          <div className="desc">Sắp xếp mới → cũ.</div>
          {records.map((r, i) => (
            <div className="visit" key={r.id} style={rv(20 + i)}>
              <div className="d">{r.day}</div>
              <div className="vsub">{r.doctorName} · HA {r.vitals.bloodPressure} · Nhịp {r.vitals.heartRate} · SpO₂ {r.vitals.spO2}% · {r.vitals.temperature}°C</div>
              <div className="row"><div className="k">Chẩn đoán</div>{r.diagnoses.map((d) => <span className="tag" key={d}>{d}</span>)}</div>
              <div className="row"><div className="k">Thuốc</div>{r.medications.map((m) => <span className="tag med" key={m.name}>{m.name}{m.instruction ? ` · ${m.instruction}` : ""}</span>)}</div>
              <div className="row"><div className="k">Xét nghiệm</div>{r.labResults.map((l) => <span className={`tag lab ${l.isAbnormal ? "warn" : ""}`} key={l.name}>{l.name}: {String(l.value)} {l.unit}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ExamDashboard = memo(ExamDashboardInner);
