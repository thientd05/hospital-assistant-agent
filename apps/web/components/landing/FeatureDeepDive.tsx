import {
  Activity,
  BellRing,
  CalendarClock,
  FileHeart,
  Languages,
  Lock,
  MessageCircleHeart,
  Stethoscope,
} from "lucide-react";
import { Reveal } from "./Reveal";

const FEATURES = [
  {
    icon: MessageCircleHeart,
    title: "Trợ lý AI hỏi đáp 24/7",
    body:
      "Hỏi bằng tiếng Việt tự nhiên về thuốc, triệu chứng, chế độ ăn, kết quả xét nghiệm. Trả lời tức thì, không phải chờ đến giờ hành chính.",
    tags: ["Tiếng Việt tự nhiên", "Phản hồi ngay", "Không tính phí"],
  },
  {
    icon: Stethoscope,
    title: "Bác sĩ gia đình theo dõi bạn",
    body:
      "Mỗi bệnh nhân có bác sĩ phụ trách — hiểu tiền sử, quen thói quen. AI ghi chép, bác sĩ là người quyết định.",
    tags: ["1 bác sĩ riêng", "Hiểu hồ sơ bạn", "Tái khám đúng người"],
  },
  {
    icon: CalendarClock,
    title: "Đặt lịch trong 30 giây",
    body:
      "Chọn ngày — chọn bác sĩ quen hoặc để hệ thống xếp người phù hợp. Hàng chờ chung giúp khám sớm khi bác sĩ quen bận.",
    tags: ["Đặt online", "Hàng chờ chung", "Đổi/huỷ dễ"],
  },
  {
    icon: Activity,
    title: "Theo dõi sức khoẻ tại nhà",
    body:
      "Tự ghi SpO₂, huyết áp, nhịp tim, nhiệt độ — biểu đồ tự cập nhật. Bác sĩ nhìn được số liệu khi bạn đến khám.",
    tags: ["Huyết áp", "SpO₂", "Biểu đồ trực quan"],
  },
  {
    icon: FileHeart,
    title: "Hồ sơ sức khoẻ điện tử",
    body:
      "Tiền sử, dị ứng, đơn thuốc, kết quả xét nghiệm — tất cả trong một nơi. Không cần mang sổ giấy, không sợ mất.",
    tags: ["Luôn sẵn sàng", "Chia sẻ với bác sĩ", "Không giấy tờ"],
  },
  {
    icon: BellRing,
    title: "Nhắc lịch — không quên gì",
    body:
      "App nhắc uống thuốc, đo huyết áp, đặt lịch tái khám, tiêm chủng cho con. Quên một lần là quên hẳn — chúng tôi nhắc giúp bạn.",
    tags: ["Nhắc uống thuốc", "Nhắc tái khám", "Nhắc tiêm chủng"],
  },
  {
    icon: Languages,
    title: "Tiếng Việt từ đầu đến cuối",
    body:
      "Không phải bản dịch máy. Trợ lý AI và mọi nhân viên đều dùng đúng cách xưng hô, đúng thuật ngữ y khoa Việt Nam.",
    tags: ["Nội bộ Việt Nam", "Đúng ngữ cảnh", "Không google dịch"],
  },
  {
    icon: Lock,
    title: "Riêng tư & an toàn",
    body:
      "Hồ sơ của bạn chỉ bác sĩ phụ trách và bạn thấy được. Dữ liệu sức khoẻ được bảo mật theo quy định y tế Việt Nam.",
    tags: ["Bảo mật", "Chỉ bác sĩ của bạn", "Tuân thủ pháp lý"],
  },
];

export function FeatureDeepDive() {
  return (
    <section id="features" className="relative bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              Tính năng cho bệnh nhân
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Mọi thứ bạn cần — gói gọn trong một app.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Trợ lý AI là tiện ích lớn nhất, nhưng app còn nhiều thứ giúp cuộc sống nhẹ hơn:
              hồ sơ điện tử, nhắc lịch, theo dõi tại nhà — và bác sĩ luôn ở phía sau.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={0.04 * (i + 1)}>
              <article className="group relative h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-600/20">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {f.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-100"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
