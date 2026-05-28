import { Award, Stethoscope } from "lucide-react";
import { Reveal } from "./Reveal";

const DOCTORS = [
  {
    initials: "NH",
    name: "BS.CKII Nguyễn Thị Hà",
    specialty: "Nội tim mạch",
    years: 22,
    note: "Thạc sĩ ĐH Y Dược TP.HCM · Tu nghiệp Singapore",
    tone: "from-rose-100 to-rose-50",
  },
  {
    initials: "TM",
    name: "BS.CKI Trần Văn Minh",
    specialty: "Nhi khoa",
    years: 15,
    note: "Trưởng khoa Nhi · Phòng khám gia đình hơn 10 năm",
    tone: "from-sky-100 to-sky-50",
  },
  {
    initials: "LH",
    name: "BS. Lê Thị Hương",
    specialty: "Sản phụ khoa",
    years: 18,
    note: "Theo dõi thai kỳ · Khám sức khoẻ phụ nữ định kỳ",
    tone: "from-violet-100 to-violet-50",
  },
  {
    initials: "PĐ",
    name: "BS.CKI Phạm Quang Đạt",
    specialty: "Hô hấp",
    years: 12,
    note: "Điều trị hen, COPD · Tư vấn cai thuốc lá",
    tone: "from-emerald-100 to-emerald-50",
  },
];

export function DoctorTeam() {
  return (
    <section id="doctors" className="relative bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
                Đội ngũ bác sĩ
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                AI đứng cạnh, bác sĩ đứng đầu.
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Mọi quyết định chuyên môn đều do bác sĩ — những con người thật, đã đồng hành cùng
                hàng nghìn gia đình Việt Nam. AI chỉ ghi chép, nhắc nhở, gợi ý —{" "}
                <strong className="text-slate-800">không kê đơn, không thay bác sĩ</strong>.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
              <Award className="h-3.5 w-3.5" />
              50+ bác sĩ chuyên khoa
            </span>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DOCTORS.map((d, i) => (
            <Reveal key={d.name} delay={0.05 * (i + 1)}>
              <article className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5">
                <div
                  className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${d.tone}`}
                >
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-semibold text-brand-800 shadow-md shadow-brand-900/10 ring-4 ring-white">
                    {d.initials}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-slate-900">{d.name}</h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    <Stethoscope className="h-3 w-3" />
                    {d.specialty}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">
                    {d.note}
                  </p>
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    {d.years} năm kinh nghiệm
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-sm text-brand-900 sm:flex sm:items-center sm:gap-4">
            <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-brand-100">
              <Stethoscope className="h-4 w-4" />
            </span>
            <p className="mt-3 sm:mt-0">
              <strong>AI không thay thế bác sĩ.</strong> Trợ lý ảo trả lời câu hỏi đời thường,
              ghi chép, nhắc lịch — khi cần khám hoặc kê đơn, bạn được kết nối với bác sĩ thật
              của phòng khám.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
