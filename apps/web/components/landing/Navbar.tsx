"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { BrandMark } from "./BrandMark";

const NAV_LINKS = [
  { href: "#value", label: "Vì sao chọn chúng tôi" },
  { href: "#specialties", label: "Chuyên khoa" },
  { href: "#how", label: "Cách đặt lịch" },
  { href: "#doctors", label: "Đội ngũ bác sĩ" },
  { href: "#faq", label: "Câu hỏi" },
];

function getAppHref(role: string | null): { href: string; label: string } {
  if (role === "manager") return { href: "/admin/manager", label: "Trang quản lý" };
  if (role === "expert") return { href: "/admin/expert", label: "Trang chuyên gia" };
  if (role === "doctor") return { href: "/chat", label: "Vào ứng dụng" };
  if (role === "patient") return { href: "/chat", label: "Sức khoẻ của tôi" };
  return { href: "/login", label: "Đăng nhập / Đặt lịch" };
}

export function Navbar() {
  const { role, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cta = mounted && !isLoading ? getAppHref(role) : { href: "/login", label: "Đăng nhập" };

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/70 bg-white/85 backdrop-blur-md"
          : "border-b border-transparent bg-white/0"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <BrandMark />

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {mounted && role ? (
            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Đang đăng nhập · {role}
            </span>
          ) : null}
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-brand-600/30"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
          aria-label="Mở menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {l.label}
              </a>
            ))}
            <Link
              href={cta.href}
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
