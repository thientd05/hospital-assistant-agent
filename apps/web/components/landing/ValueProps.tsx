import { CalendarHeart, HeartPulse, Sparkles } from "lucide-react";
import { Reveal } from "./Reveal";

const ITEMS = [
  {
    icon: Sparkles,
    title: "Trợ lý AI riêng cho bạn — 24/7",
    body:
      "Hỏi về thuốc, chế độ ăn, kết quả xét nghiệm bất cứ lúc nào. AI tiếng Việt tự nhiên, hiểu hồ sơ của bạn — nếu cần chuyên môn, bác sĩ tiếp nhận ngay.",
  },
  {
    icon: CalendarHeart,
    title: "Đặt lịch nhanh — nhắc tái khám tự động",
    body:
      "Chọn bác sĩ quen hoặc để hệ thống xếp người phù hợp. App nhắc lịch khám, nhắc uống thuốc, nhắc xét nghiệm định kỳ — bạn không cần nhớ.",
  },
  {
    icon: HeartPulse,
    title: "Theo dõi sức khoẻ tại nhà",
    body:
      "Ghi SpO₂, huyết áp, nhịp tim, nhiệt độ ngay trong app. Bác sĩ của bạn nhìn được dữ liệu này khi tái khám — không cần mang sổ tay nữa.",
  },
];

export function ValueProps() {
  return (
    <section id="value" className="relative">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
            Vì sao chọn Hospital AI
          </p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Phòng khám gia đình — nay có một “bác sĩ AI” đồng hành.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Chúng tôi giữ tinh thần phòng khám gia đình truyền thống: bác sĩ hiểu bạn, hiểu cả nhà bạn.
            AI là người trợ thủ đứng sau, giúp bạn chủ động hơn trong việc chăm sóc sức khoẻ.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ITEMS.map((it, i) => (
            <Reveal key={it.title} delay={0.05 * (i + 1)}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                <div
                  aria-hidden
                  className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-100/0 transition-colors group-hover:bg-brand-100/60"
                />
                <div className="relative">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <it.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {it.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{it.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
