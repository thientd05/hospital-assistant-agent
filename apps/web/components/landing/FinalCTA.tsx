"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck, Phone } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  const { role, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const loggedIn = mounted && !isLoading && Boolean(role);
  const primary = !loggedIn
    ? { href: "/login", label: "Tạo tài khoản — đặt lịch ngay" }
    : role === "manager"
    ? { href: "/admin/manager", label: "Trang quản lý" }
    : role === "expert"
    ? { href: "/admin/expert", label: "Trang chuyên gia" }
    : role === "patient"
    ? { href: "/chat", label: "Sức khoẻ của tôi" }
    : { href: "/chat", label: "Vào ứng dụng" };

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-14 text-center shadow-2xl shadow-brand-900/20 sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="brand-blob absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-400/30 blur-3xl"
            />
            <div
              aria-hidden
              className="brand-blob absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-brand-300/25 blur-3xl"
              style={{ animationDelay: "-9s" }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-10 [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:24px_24px]"
            />

            <div className="relative">
              <p className="text-sm font-medium text-brand-100">
                Phòng khám gia đình thông minh — của bạn và gia đình
              </p>
              <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Một bác sĩ gia đình. Một trợ lý AI. Cả nhà yên tâm.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-brand-100 sm:text-base">
                Tạo tài khoản miễn phí trong 2 phút, hoặc gọi hotline để được tư vấn trực tiếp.
                Bác sĩ và trợ lý AI sẵn sàng đón bạn.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={primary.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-brand-700 shadow-lg shadow-black/10 transition-all hover:bg-brand-50"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {primary.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="tel:19008088"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  <Phone className="h-4 w-4" />
                  Hotline 1900 8088
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
