"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { MockChatPanel } from "./MockChatPanel";

export function Hero() {
  const { role, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const loggedIn = mounted && !isLoading && Boolean(role);
  const primaryHref = !loggedIn
    ? "/login"
    : role === "manager"
    ? "/admin/manager"
    : role === "expert"
    ? "/admin/expert"
    : "/chat";
  const primaryLabel = !loggedIn
    ? "Đặt lịch khám"
    : role === "patient"
    ? "Sức khoẻ của tôi"
    : "Vào ứng dụng";

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,#f0fafb_0%,#ffffff_60%)]"
      />
      <div
        aria-hidden
        className="brand-grid-bg absolute inset-x-0 top-0 -z-10 h-[420px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div
        aria-hidden
        className="brand-blob absolute -right-32 top-32 -z-10 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-brand-50/80 px-3 py-1 text-xs font-medium text-brand-700">
            <MapPin className="h-3.5 w-3.5" />
            Phòng khám gia đình · TP.HCM · Hà Nội
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Chăm sóc gia đình bạn —{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 bg-clip-text text-transparent">
                có AI đồng hành
              </span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 z-0 h-3 w-full rounded-full bg-brand-100/80"
              />
            </span>{" "}
            <br className="hidden sm:block" />
            24/7.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            <strong className="text-slate-800">FamilyHealth AI</strong> là phòng khám gia đình với
            trợ lý AI cá nhân cho từng bệnh nhân: hỏi đáp tức thì, đặt lịch một chạm, theo dõi
            sức khoẻ tại nhà — đội ngũ bác sĩ luôn đồng hành phía sau.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={primaryHref}
              className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-brand-600/40"
            >
              <CalendarCheck className="h-4 w-4" />
              {primaryLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <Sparkles className="h-4 w-4" />
              Trải nghiệm trợ lý AI
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <strong>4.9/5</strong> · 1.200+ đánh giá
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              Bảo hiểm y tế · Bảo hiểm tư nhân
            </div>
            <div className="text-slate-500">
              Hotline 24/7: <strong className="text-slate-800">1900 8088</strong>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-6xl">
          <MockChatPanel variant="patient" />
        </div>
      </div>
    </section>
  );
}
