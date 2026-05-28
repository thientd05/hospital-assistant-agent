import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandMark } from "./BrandMark";

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function YoutubeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M23.5 7.2a3 3 0 0 0-2.1-2.13C19.55 4.5 12 4.5 12 4.5s-7.55 0-9.4.57A3 3 0 0 0 .5 7.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.13c1.85.57 9.4.57 9.4.57s7.55 0 9.4-.57a3 3 0 0 0 2.1-2.13c.34-1.58.5-3.18.5-4.8a31.4 31.4 0 0 0-.5-4.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  );
}

const COLUMNS = [
  {
    title: "Phòng khám",
    links: [
      { label: "Về chúng tôi", href: "#" },
      { label: "Đội ngũ bác sĩ", href: "#doctors" },
      { label: "Chuyên khoa", href: "#specialties" },
      { label: "Tuyển dụng", href: "#" },
    ],
  },
  {
    title: "Dịch vụ",
    links: [
      { label: "Đặt lịch khám", href: "/login" },
      { label: "Khám tại nhà", href: "#" },
      { label: "Trợ lý AI", href: "#features" },
      { label: "Tầm soát định kỳ", href: "#" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#faq" },
      { label: "Hướng dẫn dùng app", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản dịch vụ", href: "#" },
    ],
  },
];

const LOCATIONS = [
  {
    city: "TP.HCM",
    addr: "123 Lê Lợi, Phường Bến Nghé, Quận 1",
    hours: "T2–T7: 7:00–20:00 · CN: 8:00–17:00",
  },
  {
    city: "Hà Nội",
    addr: "45 Tràng Tiền, Phường Tràng Tiền, Hoàn Kiếm",
    hours: "T2–T7: 7:00–20:00 · CN: 8:00–17:00",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <BrandMark href={null} />
            <p className="mt-4 max-w-sm text-sm text-slate-600">
              Phòng khám gia đình thông minh — bác sĩ đồng hành cùng bạn, trợ lý AI hỗ trợ 24/7.
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <a href="tel:19008088" className="flex items-center gap-2 hover:text-brand-700">
                <Phone className="h-4 w-4 text-brand-600" />
                Hotline: <strong className="text-slate-900">1900 8088</strong>
              </a>
              <a
                href="mailto:lienhe@hospital-ai.vn"
                className="flex items-center gap-2 hover:text-brand-700"
              >
                <Mail className="h-4 w-4 text-brand-600" />
                lienhe@hospital-ai.vn
              </a>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                aria-label="Facebook"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                aria-label="YouTube"
              >
                <YoutubeIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-600 transition-colors hover:text-brand-700"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2">
          {LOCATIONS.map((loc) => (
            <div key={loc.city} className="flex items-start gap-3 text-sm">
              <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold text-slate-900">{loc.city}</div>
                <div className="text-slate-600">{loc.addr}</div>
                <div className="mt-0.5 text-xs text-slate-500">{loc.hours}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Hospital AI · Phòng khám gia đình thông minh.</p>
          <p>Giấy phép hoạt động khám chữa bệnh số 1234/HCM-GPHĐ — Sở Y tế cấp.</p>
        </div>
      </div>
    </footer>
  );
}
