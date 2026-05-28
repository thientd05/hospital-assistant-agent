import {
  Activity,
  Baby,
  Bone,
  Brain,
  Ear,
  HeartPulse,
  Salad,
  Search,
  Stethoscope,
  Sun,
  UtensilsCrossed,
  Wind,
} from "lucide-react";
import { Reveal } from "./Reveal";

const SPECIALTIES = [
  { icon: Stethoscope, name: "Khám tổng quát", desc: "Bác sĩ gia đình, tư vấn ban đầu" },
  { icon: Baby, name: "Nhi khoa", desc: "Trẻ sơ sinh đến tuổi học đường" },
  { icon: HeartPulse, name: "Nội tim mạch", desc: "Huyết áp, suy tim, mạch vành" },
  { icon: Wind, name: "Hô hấp", desc: "Hen, COPD, viêm phổi" },
  { icon: UtensilsCrossed, name: "Tiêu hoá – gan mật", desc: "Dạ dày, đại tràng, gan" },
  { icon: Activity, name: "Sản phụ khoa", desc: "Khám thai, sức khoẻ phụ nữ" },
  { icon: Sun, name: "Da liễu", desc: "Mụn, nám, dị ứng da" },
  { icon: Ear, name: "Tai mũi họng", desc: "Viêm xoang, viêm họng, ù tai" },
  { icon: Bone, name: "Cơ xương khớp", desc: "Thoái hoá, đau lưng, chấn thương" },
  { icon: Salad, name: "Dinh dưỡng", desc: "Tiểu đường, giảm cân, ăn lành" },
  { icon: Brain, name: "Tâm lý", desc: "Lo âu, mất ngủ, stress" },
  { icon: Search, name: "Tầm soát ung thư", desc: "Gói khám định kỳ chuyên sâu" },
];

export function Specialties() {
  return (
    <section id="specialties" className="relative bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              Chuyên khoa
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              12 chuyên khoa — một địa chỉ cho cả gia đình.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Từ thăm khám tổng quát đến chuyên sâu. Trợ lý AI giúp bạn chọn đúng chuyên khoa
              trước khi đặt lịch — không phải đoán mò.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SPECIALTIES.map((s, i) => (
            <Reveal key={s.name} delay={0.02 * (i + 1)}>
              <article className="group flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
                <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-100">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {s.name}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {s.desc}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
