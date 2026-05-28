import { Reveal } from "./Reveal";

const ITEMS = [
  { num: "10+", label: "Năm phục vụ cộng đồng" },
  { num: "50+", label: "Bác sĩ chuyên khoa" },
  { num: "25.000+", label: "Bệnh nhân tin tưởng" },
  { num: "12", label: "Chuyên khoa khám chữa" },
  { num: "24/7", label: "Trợ lý AI hỗ trợ" },
];

export function TrustBar() {
  return (
    <Reveal as="section" className="border-y border-slate-200/70 bg-surface/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-6 px-5 py-10 sm:grid-cols-3 sm:px-8 lg:grid-cols-5">
        {ITEMS.map((it) => (
          <div key={it.label} className="text-center sm:text-left">
            <div className="bg-gradient-to-br from-brand-700 to-brand-500 bg-clip-text text-2xl font-semibold text-transparent">
              {it.num}
            </div>
            <div className="mt-1 text-xs text-slate-500">{it.label}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
