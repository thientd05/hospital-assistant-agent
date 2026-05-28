import { CalendarCheck, MessageCircleHeart, UserPlus } from "lucide-react";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    icon: UserPlus,
    title: "Tạo tài khoản — miễn phí",
    body:
      "Đăng ký bằng số điện thoại hoặc đến quầy lễ tân lần đầu. Phòng khám lập hồ sơ sức khoẻ điện tử cho bạn, gắn với bác sĩ gia đình phụ trách.",
  },
  {
    icon: MessageCircleHeart,
    title: "Hỏi trợ lý AI — hoặc đặt lịch ngay",
    body:
      "Mở app, nhắn “tôi bị ho 3 ngày rồi” hay “cho con tôi đi khám nhi tuần này” — trợ lý AI gợi ý chuyên khoa, kiểm tra lịch trống và đặt lịch giúp bạn.",
  },
  {
    icon: CalendarCheck,
    title: "Khám — và theo dõi tại nhà",
    body:
      "Sau buổi khám, bác sĩ ghi đơn vào hồ sơ. App nhắc bạn uống thuốc, đo huyết áp tại nhà, đặt lịch tái khám. Trợ lý AI sẵn sàng 24/7 cho mọi thắc mắc giữa các lần khám.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              Cách bắt đầu
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Ba bước — đơn giản như nhắn tin.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Bạn không cần học gì mới. Hỏi trợ lý AI bằng tiếng Việt tự nhiên như đang nhắn cho
              một người bạn — phần còn lại phòng khám lo.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={0.06 * (i + 1)}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-brand-50/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="ml-auto bg-gradient-to-br from-brand-700 to-brand-300 bg-clip-text text-5xl font-semibold leading-none text-transparent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
