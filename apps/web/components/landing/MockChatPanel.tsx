"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  LogOut,
  PanelLeftClose,
  Plus,
  Send,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { ReactNode } from "react";

type Variant = "doctor" | "manager" | "expert" | "patient";
type Props = { variant?: Variant };

export function MockChatPanel({ variant = "doctor" }: Props) {
  if (variant === "manager" || variant === "expert") {
    return <AdminMock variant={variant} />;
  }
  return <ChatMock variant={variant} />;
}

function BrowserChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-4 -top-4 bottom-0 -z-10 rounded-[28px] bg-gradient-to-br from-brand-100/60 via-white to-brand-50/80 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-brand-900/10">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="ml-3 flex h-6 max-w-[280px] flex-1 items-center gap-1.5 rounded-md bg-white px-2 text-[10px] text-slate-400 ring-1 ring-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            family-healthcare-ai-thienta.vercel.app/chat
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- CHAT MOCK ----------------------------- */

const CHAT_DATA: Record<
  "doctor" | "patient",
  {
    appTitle: string;
    user: { initials: string; name: string; sub: string };
    history: { label: string; active?: boolean }[];
    message: ReactNode;
    inputPlaceholder: string;
    panel: {
      tabs: string[];
      activeTab: number;
      header: ReactNode;
      content: ReactNode;
    };
  }
> = {
  doctor: {
    appTitle: "Trợ Lý Ảo",
    user: {
      initials: "TM",
      name: "BS. Trần Quang Minh",
      sub: "Suy tim, tăng huyết áp, rối loạn n…",
    },
    history: [
      { label: "bắt đầu tiếp nhận bệnh nhân Trị…", active: true },
      { label: "hãy tạo 1 lịch tái khám cho bệnh…" },
      { label: "bắt đầu ghi chép bệnh nhân Ngu…" },
      { label: "lấy danh sách bệnh nhân" },
      { label: "liệt kê bệnh nhân hiện có" },
      { label: "cho tôi xem lịch hẹn" },
      { label: "lấy danh sách bệnh nhân" },
      { label: "bắt đầu ghi chép thông tin bệnh…" },
      { label: "hôm nay tôi nên làm gì?" },
      { label: "chào, bạn là ai?" },
    ],
    message: <DoctorMessage />,
    inputPlaceholder: "Tôi có thể giúp gì cho bác sĩ hôm nay?",
    panel: {
      tabs: ["Bệnh nhân", "Hồ sơ", "Lab", "Lịch hẹn", "Tươ…"],
      activeTab: 0,
      header: <PatientsPanelHeader />,
      content: <PatientsList />,
    },
  },
  patient: {
    appTitle: "Trợ Lý Ảo",
    user: {
      initials: "NA",
      name: "Nguyễn Văn A",
      sub: "BN001 · Tăng huyết áp, ĐTĐ type 2",
    },
    history: [
      { label: "tôi nên ăn gì để giảm đường huyết?", active: true },
      { label: "kết quả xét nghiệm lần trước…" },
      { label: "đặt lịch khám tuần sau" },
      { label: "SpO₂ 92 có sao không?" },
      { label: "thuốc huyết áp uống lúc nào?" },
      { label: "lịch tái khám của tôi" },
      { label: "tôi có thể tự đo huyết áp?" },
      { label: "chào, bạn là ai?" },
    ],
    message: <PatientMessage />,
    inputPlaceholder: "Bạn cần hỏi gì hôm nay?",
    panel: {
      tabs: ["Hồ sơ", "Lịch hẹn"],
      activeTab: 0,
      header: <RecordHeader />,
      content: <RecordDetail />,
    },
  },
};

function ChatMock({ variant }: { variant: "doctor" | "patient" }) {
  const d = CHAT_DATA[variant];
  return (
    <BrowserChrome>
      <div className="grid h-[480px] grid-cols-1 bg-white text-[12px] sm:h-[520px] md:h-[560px] md:grid-cols-[1fr_300px] lg:grid-cols-[180px_1fr_320px]">
        {/* Sidebar */}
        <aside className="hidden min-h-0 flex-col border-r border-slate-100 bg-slate-50/50 lg:flex">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center text-brand-600">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold text-brand-800">
                {d.appTitle}
              </span>
              <ChevronDown className="h-3 w-3 text-brand-700" />
            </div>
            <PanelLeftClose className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <button className="mx-3 mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-white">
            <Plus className="h-3.5 w-3.5 text-brand-700" />
            New chat
          </button>

          <div className="mt-4 px-3 text-[10px] uppercase tracking-wide text-slate-400">
            Các đoạn chat gần đây
          </div>

          <ul className="mt-1 flex-1 space-y-0.5 overflow-hidden px-2">
            {d.history.map((h, i) => (
              <li key={i}>
                <a
                  className={`block truncate rounded-md px-2 py-1.5 text-[11.5px] transition-colors ${
                    h.active
                      ? "bg-brand-100 text-brand-900"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {h.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mx-2 mb-2 flex items-center gap-2 rounded-md bg-white p-2 ring-1 ring-slate-200/70">
            <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
              {d.user.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-semibold text-slate-800">
                {d.user.name}
              </div>
              <div className="truncate text-[10px] text-slate-500">
                {d.user.sub}
              </div>
            </div>
            <LogOut className="h-3 w-3 flex-shrink-0 text-slate-400" />
          </div>
        </aside>

        {/* Chat */}
        <section className="relative flex min-h-0 min-w-0 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-5 py-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="markdown-body max-w-full text-[12.5px] leading-relaxed text-slate-800"
            >
              {d.message}
            </motion.div>
          </div>
          <div className="border-t border-slate-100 px-5 py-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <button className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 text-[12px] text-slate-400">
                {d.inputPlaceholder}
              </div>
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white shadow-sm">
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        {/* Workspace panel */}
        <aside className="hidden min-h-0 min-w-0 flex-col border-l border-slate-100 bg-white md:flex">
          <div className="flex items-center gap-3 overflow-hidden border-b border-slate-100 px-4">
            {d.panel.tabs.map((t, i) => (
              <button
                key={t}
                className={`relative whitespace-nowrap py-2.5 text-[11.5px] font-medium ${
                  i === d.panel.activeTab
                    ? "text-brand-800"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t}
                {i === d.panel.activeTab ? (
                  <motion.span
                    layoutId="panel-tab"
                    className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand-700"
                  />
                ) : null}
              </button>
            ))}
          </div>

          <div className="border-b border-slate-100 px-4 py-3">{d.panel.header}</div>

          <div className="min-h-0 flex-1 space-y-2 overflow-hidden px-4 py-3">
            {d.panel.content}
          </div>
        </aside>
      </div>
    </BrowserChrome>
  );
}

/* --------------------------- DOCTOR CONTENT --------------------------- */

function DoctorMessage() {
  return (
    <div className="space-y-2.5">
      <p>
        <span className="font-semibold text-emerald-700">✓ Kiểm tra tương tác:</span>{" "}
        Không có tương tác đáng kể giữa amlodipine, metformin, aspirin.
      </p>
      <p>Bây giờ tôi sẽ ghi danh sách thuốc vào hồ sơ bệnh nhân.</p>

      <details className="rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 text-[11.5px] [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center gap-2 text-slate-700">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Mở cửa số làm việc
          <ChevronDown className="ml-auto h-3 w-3" />
        </summary>
      </details>

      <details className="rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 text-[11.5px]">
        <summary className="flex items-center gap-2 text-slate-700 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Thao tác
          <ChevronDown className="ml-auto h-3 w-3" />
        </summary>
      </details>

      <p>Đã ghi đơn thuốc vào hồ sơ:</p>
      <ul className="list-disc space-y-0.5 pl-5">
        <li>
          <strong>Amlodipine 5mg</strong> — kiểm soát huyết áp
        </li>
        <li>
          <strong>Metformin 500mg</strong> — kiểm soát đường huyết type 2
        </li>
        <li>
          <strong>Aspirin 81mg</strong> — bảo vệ tim mạch
        </li>
      </ul>

      <p className="pt-1">
        <strong>Lưu ý theo dõi:</strong>
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
        <li>Creatinine 1.4 (suy thận nhẹ) → theo dõi thận.</li>
        <li>SpO₂ 90% + NT-proBNP cao → cân nhắc echocardiogram.</li>
      </ul>
    </div>
  );
}

function PatientsPanelHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 truncate rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-400 ring-1 ring-slate-200/70">
        Tìm theo tên, mã, khoa, chẩn đoán…
      </div>
      <button className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-sm">
        <Plus className="h-3 w-3" />
        Tạo
      </button>
    </div>
  );
}

const PATIENTS = [
  {
    name: "Phạm Thị D",
    code: "BN004",
    sub: "Nữ · 67 tuổi · Hô hấp",
    tags: ["COPD đợt cấp", "Suy hô hấp type 2"],
  },
  {
    name: "Lê Minh C",
    code: "BN003",
    sub: "Nam · 32 tuổi · Cấp cứu",
    tags: ["Chấn thương đầu kín", "GCS 14"],
  },
  {
    name: "Trần Thị B",
    code: "BN002",
    sub: "Nữ · 45 tuổi · Nội Tổng quát",
    tags: ["Đau ngực điển hình", "Tăng huyết áp"],
  },
  {
    name: "Nguyễn Văn A",
    code: "BN001",
    sub: "Nam · 58 tuổi · Nội Tim mạch",
    tags: ["Tăng huyết áp", "ĐTĐ type 2"],
  },
];

function PatientsList() {
  return (
    <>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        4 / 4 bệnh nhân
      </div>
      <div className="space-y-2">
        {PATIENTS.slice(0, 3).map((p) => (
          <div
            key={p.code}
            className="rounded-lg border border-slate-200/80 bg-white p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-slate-800">
                  {p.name}
                </div>
                <div className="truncate text-[10.5px] text-slate-500">{p.sub}</div>
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {p.code}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[9.5px] font-medium text-brand-800"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* --------------------------- PATIENT CONTENT --------------------------- */

function PatientMessage() {
  return (
    <div className="space-y-2.5">
      <p>
        Chào anh A 👋 — đường huyết hiện kiểm soát ở mức ổn (HbA1c 6.8%). Để giữ ổn định, anh nên:
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
        <li>
          <strong>Hạn chế tinh bột nhanh</strong>: cơm trắng, bún, bánh ngọt.
        </li>
        <li>
          <strong>Ưu tiên chất xơ</strong>: rau xanh, gạo lứt, đậu.
        </li>
        <li>
          <strong>Đo SpO₂ + huyết áp sáng/tối</strong> và mang theo khi tái khám.
        </li>
      </ul>

      <details className="rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 text-[11.5px]">
        <summary className="flex items-center gap-2 text-slate-700 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Đọc hồ sơ của bạn
          <ChevronDown className="ml-auto h-3 w-3" />
        </summary>
      </details>

      <p>
        Tôi đã thấy SpO₂ tuần này dao động 92–95%. Nếu dưới <strong>90%</strong>, anh nên đặt lịch khám sớm — tôi có thể giúp đặt ngay nếu cần.
      </p>
    </div>
  );
}

function RecordHeader() {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold text-slate-900">
          Nguyễn Văn A
        </div>
        <div className="text-[11px] text-slate-400">BN001</div>
      </div>
      <button className="flex-shrink-0 rounded-md border border-brand-200 px-3 py-1 text-[11px] font-medium text-brand-700">
        Sửa
      </button>
    </div>
  );
}

const PROFILE_INFO = [
  { l: "Họ tên", v: "Nguyễn Văn A" },
  { l: "Tuổi", v: "58" },
  { l: "Giới tính", v: "Nam" },
  { l: "Khoa", v: "Nội Tim mạch" },
  { l: "Điện thoại", v: "0901234001" },
];

const VITAL_SIGNS = [
  { l: "SpO₂", v: "91 %", abnormal: true },
  { l: "Nhịp tim", v: "102 bpm", abnormal: true },
  { l: "Huyết áp", v: "148/92 mmHg", abnormal: false },
  { l: "Nhiệt độ", v: "37.1 °C", abnormal: false },
];

const LABS = [
  { name: "NT-proBNP", value: "2840", unit: "pg/mL", ref: "<125" },
  { name: "Creatinine", value: "1.4", unit: "mg/dL", ref: "0.7-1.2" },
  { name: "Hb", value: "11.2", unit: "g/dL", ref: "13-17" },
  { name: "HbA1c", value: "7.8", unit: "%", ref: "<6.5" },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
      {children}
    </div>
  );
}

function RecordDetail() {
  return (
    <div className="space-y-4">
      {/* THÔNG TIN */}
      <div className="space-y-1.5">
        <SectionLabel>Thông tin</SectionLabel>
        {PROFILE_INFO.map((r) => (
          <div key={r.l} className="flex items-baseline justify-between gap-3 text-[11.5px]">
            <span className="text-slate-500">{r.l}</span>
            <span className="truncate text-slate-900">{r.v}</span>
          </div>
        ))}
      </div>

      {/* SINH HIỆU */}
      <div className="space-y-1.5">
        <SectionLabel>Sinh hiệu</SectionLabel>
        {VITAL_SIGNS.map((v) => (
          <div key={v.l} className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="text-slate-500">{v.l}</span>
            {v.abnormal ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                {v.v}
              </span>
            ) : (
              <span className="text-slate-900">{v.v}</span>
            )}
          </div>
        ))}
      </div>

      {/* XÉT NGHIỆM */}
      <div className="space-y-1">
        <SectionLabel>Xét nghiệm</SectionLabel>
        <div className="grid grid-cols-12 gap-1 border-b border-slate-200 pb-1 text-[9px] uppercase tracking-wider text-slate-400">
          <span className="col-span-5">Xét nghiệm</span>
          <span className="col-span-3">Kết quả</span>
          <span className="col-span-2">Đơn vị</span>
          <span className="col-span-2 text-right">Tham chiếu</span>
        </div>
        {LABS.map((r) => (
          <div
            key={r.name}
            className="-mx-2 grid grid-cols-12 items-center gap-1 rounded bg-red-50/60 px-2 py-1 text-[11px]"
          >
            <span className="col-span-5 truncate text-slate-700">{r.name}</span>
            <span className="col-span-3 font-medium text-red-700">{r.value}</span>
            <span className="col-span-2 text-slate-500">{r.unit}</span>
            <span className="col-span-2 text-right text-slate-400">{r.ref}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- ADMIN MOCK ----------------------------- */

const ADMIN_DATA: Record<
  "manager" | "expert",
  {
    title: string;
    user: { initials: string; name: string; sub: string };
    nav: { label: string; icon: typeof BarChart3; active?: boolean }[];
    main: ReactNode;
  }
> = {
  manager: {
    title: "Bảng điều hành",
    user: { initials: "QM", name: "Quản lý chuỗi", sub: "QL001" },
    nav: [
      { label: "Thống kê", icon: BarChart3, active: true },
      { label: "Quản lý tài khoản", icon: Stethoscope },
      { label: "Chi phí", icon: HeartPulse },
      { label: "Doanh thu", icon: GraduationCap },
    ],
    main: <ManagerMain />,
  },
  expert: {
    title: "Skill editor",
    user: { initials: "CG", name: "Chuyên gia y khoa", sub: "CG001" },
    nav: [
      { label: "Skills", icon: GraduationCap, active: true },
      { label: "Hội thoại", icon: Sparkles },
    ],
    main: <ExpertMain />,
  },
};

function AdminMock({ variant }: { variant: "manager" | "expert" }) {
  const d = ADMIN_DATA[variant];
  return (
    <BrowserChrome>
      <div className="grid h-[480px] grid-cols-1 bg-white text-[12px] md:h-[560px] md:grid-cols-[200px_1fr]">
        <aside className="hidden flex-col border-r border-slate-100 bg-slate-50/50 md:flex">
          <div className="flex items-center gap-1.5 px-3 py-3">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            <span className="text-[13px] font-semibold text-brand-800">
              FamilyHealth AI
            </span>
          </div>
          <div className="mt-2 px-3 text-[10px] uppercase tracking-wide text-slate-400">
            {d.title}
          </div>
          <ul className="mt-1 flex-1 space-y-0.5 px-2">
            {d.nav.map((n) => (
              <li key={n.label}>
                <a
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                    n.active
                      ? "bg-brand-100 text-brand-900"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <n.icon className="h-3.5 w-3.5" />
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mx-2 mb-2 flex items-center gap-2 rounded-md bg-white p-2 ring-1 ring-slate-200/70">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
              {d.user.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-semibold text-slate-800">
                {d.user.name}
              </div>
              <div className="truncate text-[10px] text-slate-500">
                {d.user.sub}
              </div>
            </div>
          </div>
        </aside>
        <main className="overflow-hidden p-5">{d.main}</main>
      </div>
    </BrowserChrome>
  );
}

function ManagerMain() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Thống kê tháng 05/2026</h3>
        <p className="text-[11px] text-slate-500">So sánh với tháng trước</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Bệnh nhân", v: "1.284", d: "+8.2%" },
          { l: "Lịch hẹn", v: "642", d: "+12%" },
          { l: "Doanh thu", v: "184.5tr", d: "+5.4%" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{s.l}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{s.v}</div>
            <div className="text-[10px] font-medium text-emerald-700">{s.d}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-[11px] font-medium text-slate-700">Doanh thu 6 tháng</div>
        <div className="flex h-32 items-end gap-2">
          {[40, 55, 48, 70, 62, 88].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              className="flex-1 rounded-t bg-gradient-to-t from-brand-700 to-brand-400"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpertMain() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">create-patient.md</h3>
        <button className="rounded-md bg-brand-700 px-3 py-1 text-[11px] font-medium text-white">
          Lưu skill
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
        <div className="text-slate-500"># create-patient</div>
        <div className="text-emerald-300">name: create-patient</div>
        <div className="text-emerald-300">
          description: Tạo bệnh nhân mới qua panel.
        </div>
        <div className="mt-2 text-slate-400">## Quy trình</div>
        <div>1. <span className="text-brand-300">read_panel</span>(&quot;Bệnh nhân&quot;)</div>
        <div>2. <span className="text-brand-300">act</span>([click <span className="text-amber-300">&quot;Tạo&quot;</span>, type họ tên…])</div>
        <div>3. Đọc snapshot xác nhận form đóng.</div>
      </div>
      <p className="text-[11px] text-slate-500">
        Lưu xong, doctor agent áp dụng skill mới ở lượt tiếp theo — không cần restart.
      </p>
    </div>
  );
}
