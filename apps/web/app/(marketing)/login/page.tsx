"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Sparkles,
  User,
} from "lucide-react";
import type {
  DoctorPublic,
  ExpertPublic,
  ManagerPublic,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { BrandMark } from "@/components/landing/BrandMark";

type LoginResponse =
  | { token: string; role: "doctor"; doctor: DoctorPublic }
  | { token: string; role: "manager"; manager: ManagerPublic }
  | { token: string; role: "patient"; patient: PatientPublic }
  | { token: string; role: "expert"; expert: ExpertPublic };

const HIGHLIGHTS = [
  "Trợ lý AI 24/7 — hỏi đáp bằng tiếng Việt tự nhiên.",
  "Đặt lịch khám trong 30 giây — nhắc tái khám tự động.",
  "Theo dõi sức khoẻ tại nhà — bác sĩ luôn cập nhật.",
];

export default function LoginPage() {
  const router = useRouter();
  const { doctor, manager, patient, expert, isLoading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (manager) router.replace("/admin/manager");
    else if (expert) router.replace("/admin/expert");
    else if (doctor || patient) router.replace("/chat");
  }, [doctor, manager, patient, expert, isLoading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Đăng nhập thất bại");
        return;
      }
      const data = (await res.json()) as LoginResponse;
      if (data.role === "manager") {
        login(data.token, { role: "manager", manager: data.manager });
        router.replace("/admin/manager");
      } else if (data.role === "patient") {
        login(data.token, { role: "patient", patient: data.patient });
        router.replace("/chat");
      } else if (data.role === "expert") {
        login(data.token, { role: "expert", expert: data.expert });
        router.replace("/admin/expert");
      } else {
        login(data.token, { role: "doctor", doctor: data.doctor });
        router.replace("/chat");
      }
    } catch {
      setError("Không kết nối được tới máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div
          aria-hidden
          className="brand-blob absolute -left-24 top-12 h-80 w-80 rounded-full bg-brand-400/40 blur-3xl"
        />
        <div
          aria-hidden
          className="brand-blob absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-brand-300/25 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-10 [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]"
        />

        <div className="relative">
          <BrandMark variant="light" />
        </div>

        <div className="relative mt-auto max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Trợ lý AI cho phòng khám
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight xl:text-4xl">
            Chào mừng trở lại — gia đình bạn đang chờ chăm sóc.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            Đăng nhập để vào hồ sơ sức khoẻ của bạn, chat với trợ lý AI, đặt lịch khám hoặc theo dõi
            chỉ số tại nhà. Bác sĩ gia đình của bạn vẫn ở đó — sẵn sàng khi bạn cần.
          </p>

          <ul className="mt-7 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-brand-50">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-brand-100 ring-1 ring-white/25">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                {h}
              </li>
            ))}
          </ul>

          <figure className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <blockquote className="text-sm leading-relaxed text-brand-50">
              “Con tôi sốt nửa đêm, tôi nhắn cho trợ lý AI — sáng đến phòng khám bác sĩ đã thấy hết
              tiền sử rồi, đỡ phải kể lại.”
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-2 text-xs text-brand-100">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 font-semibold ring-1 ring-white/25">
                L
              </span>
              <span>
                Chị Lan · Mẹ 2 con, TP.HCM
                <span className="text-brand-200"> · câu chuyện minh hoạ</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="relative flex items-center justify-center bg-white px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:left-8 sm:top-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trang chủ
        </Link>

        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <BrandMark />
          </div>

          <div className="mt-6 lg:mt-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Đăng nhập
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Chưa có tài khoản? Đến quầy lễ tân hoặc gọi{" "}
              <a href="tel:19008088" className="font-medium text-brand-700 hover:underline">
                1900 8088
              </a>{" "}
              để đăng ký.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  placeholder="vd. bs001"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pl-9 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={submitting}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-brand-700 disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang đăng nhập…
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400">
            Bằng việc đăng nhập, bạn đồng ý với điều khoản dịch vụ và chính sách quyền riêng tư của FamilyHealth AI.
          </p>
        </div>
      </main>
    </div>
  );
}
