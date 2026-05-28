import { Quote } from "lucide-react";
import { Reveal } from "./Reveal";

const QUOTES = [
  {
    text:
      "Con tôi sốt nửa đêm, tôi nhắn cho trợ lý AI — nó gợi ý hạ sốt thế nào và nhắc đặt lịch nhi sáng hôm sau. Sáng đến, bác sĩ đã thấy hết tiền sử rồi, đỡ phải kể lại.",
    name: "Chị Lan",
    role: "Mẹ 2 con · 38 tuổi · TP.HCM",
    initial: "L",
  },
  {
    text:
      "Tôi bị cao huyết áp 5 năm. Trước cứ phải nhớ ngày đo huyết áp, ghi sổ tay rồi mang đến phòng khám. Giờ ghi luôn trong app, đến lúc khám bác sĩ Hà mở ra thấy luôn cả tháng.",
    name: "Chú Hùng",
    role: "Bệnh nhân tim mạch · 55 tuổi · Hà Nội",
    initial: "H",
  },
  {
    text:
      "Tôi hay quên uống thuốc. App nhắc đều đều, mẹ tôi cũng dùng được vì AI nói tiếng Việt dễ hiểu, không bị lằng nhằng. Bác sĩ vẫn là người khám — AI chỉ là người trợ thủ.",
    name: "Bà Thuý",
    role: "Bệnh nhân tiểu đường · 62 tuổi · TP.HCM",
    initial: "T",
  },
];

export function Testimonials() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
                Bệnh nhân nói gì
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Những câu chuyện thật từ gia đình Việt.
              </h2>
            </div>
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 md:inline-block">
              Câu chuyện minh hoạ
            </span>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={0.06 * (i + 1)}>
              <figure className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <Quote className="h-6 w-6 text-brand-200" />
                <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">
                  “{q.text}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {q.initial}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {q.name}
                    </div>
                    <div className="text-xs text-slate-500">{q.role}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
