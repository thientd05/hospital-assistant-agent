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
  MapPin,
  Phone,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import type { PatientPublic } from "@pr_hospitalagent/types";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { BrandMark } from "@/components/landing/BrandMark";

type RegisterResponse = {
  token: string;
  role: "patient";
  patient: PatientPublic;
};

const HIGHLIGHTS = [
  "Tạo tài khoản miễn phí — quản lý hồ sơ sức khoẻ của bạn.",
  "Chat với trợ lý AI và tự đặt lịch khám bất cứ lúc nào.",
  "Tự nhập chỉ số tại nhà — bác sĩ gia đình luôn theo dõi.",
];

export default function RegisterPage() {
  const router = useRouter();
  const { doctor, manager, patient, expert, isLoading, login } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ">("Nam");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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

    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 150) {
      setError("Tuổi không hợp lệ.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          name: name.trim(),
          age: ageNum,
          gender,
          address: address.trim(),
          phone: phone.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: unknown;
        };
        setError(data.error ?? "Đăng ký thất bại");
        return;
      }
      const data = (await res.json()) as RegisterResponse;
      login(data.token, { role: "patient", patient: data.patient });
      router.replace("/chat");
    } catch {
      setError("Không kết nối được tới máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-slate-50";

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
            Bắt đầu hành trình chăm sóc sức khoẻ gia đình bạn.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            Tạo tài khoản bệnh nhân để trò chuyện với trợ lý AI, đặt lịch khám và theo dõi sức
            khoẻ tại nhà. Tài khoản bác sĩ và chuyên gia do phòng khám cấp riêng.
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
              Đăng ký tài khoản
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Họ và tên
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder="vd. Nguyễn Văn A"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="age" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tuổi
                </label>
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={150}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  disabled={submitting}
                  placeholder="vd. 32"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="gender"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Giới tính
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "Nam" | "Nữ")}
                  disabled={submitting}
                  className={inputClass}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Địa chỉ
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </span>
                <input
                  id="address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                  placeholder="vd. 12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Số điện thoại
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                  placeholder="vd. 0901234567"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserPlus className="h-4 w-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  placeholder="vd. nguyenvana"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Chữ thường, số, dấu chấm hoặc gạch dưới — ít nhất 3 ký tự.
              </p>
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="Ít nhất 6 ký tự"
                  className={`${inputClass} pl-9 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={submitting}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-brand-700 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Nhập lại mật khẩu
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={submitting}
                  placeholder="Nhập lại mật khẩu"
                  className={`${inputClass} pl-9`}
                />
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
                  Đang tạo tài khoản…
                </>
              ) : (
                "Tạo tài khoản"
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400">
            Bằng việc đăng ký, bạn đồng ý với điều khoản dịch vụ và chính sách quyền riêng tư của
            FamilyHealth AI.
          </p>
        </div>
      </main>
    </div>
  );
}
