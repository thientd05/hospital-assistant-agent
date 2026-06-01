"use client";

import type { CSSProperties, ReactNode } from "react";

// ─── Color tokens ──────────────────────────────────────────────────────────
// Teal đặc trưng + neutral. Màu khác chỉ dùng khi mang nghĩa.
export const BRAND = "#087E8B";
export const BRAND_DARK = "#066671";
export const BRAND_SOFT = "#C8E7E9";

// Palette biểu đồ: teal-dominant (thang đơn sắc) + 2 accent ngữ nghĩa.
export const CHART_PALETTE = [
  "#087E8B", // teal-600 (brand)
  "#3FA0A9", // teal-400
  "#9FD4D8", // teal-200
  "#066671", // teal-700
  "#F59E0B", // amber (chi phí)
  "#3B82F6", // blue (lợi nhuận)
];

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #E5E7EB",
};

export const CHART_AXIS_TICK = { fontSize: 11, fill: "#6B7280" } as const;

function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ─── StatCard (KPI) ──────────────────────────────────────────────────────────
type Tone = "default" | "accent" | "danger";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-gray-900",
  accent: "text-[#087E8B]",
  danger: "text-rose-600",
};

export function StatCard({
  label,
  value,
  subtitle,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  subtitle?: ReactNode;
  tone?: Tone;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-xl border border-gray-200 bg-white px-4 py-3",
        clickable &&
          "cursor-pointer transition-colors hover:border-[#9FD4D8] hover:bg-[#F0FAFB]"
      )}
    >
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums leading-tight",
          VALUE_TONE[tone]
        )}
      >
        {value}
      </div>
      {subtitle != null && (
        <div className="mt-0.5 text-[11px] text-gray-500">{subtitle}</div>
      )}
    </div>
  );
}

// ─── SectionTitle ────────────────────────────────────────────────────────────
export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {children}
      </span>
      {right != null && (
        <span className="text-[11px] text-gray-500 tabular-nums">{right}</span>
      )}
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
export function ChartCard({
  title,
  children,
  empty,
  className,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionTitle>{title}</SectionTitle>
      <div className="rounded-xl border border-gray-200 bg-white p-2">
        {empty ? (
          <div className="py-12 text-center text-xs text-gray-400">
            Chưa có dữ liệu.
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

// ─── Bar (thanh phần trăm) ────────────────────────────────────────────────────
export function Bar({
  label,
  value,
  total,
  rightLabel,
}: {
  label: string;
  value: number;
  total: number;
  rightLabel?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-gray-700">{label}</span>
        <span className="shrink-0 tabular-nums text-gray-500">
          {rightLabel ?? `${value} · ${pct}%`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full bg-[#087E8B]" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

// ─── Segmented (toggle) ───────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-[#066671] shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Chip (filter) ────────────────────────────────────────────────────────────
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-[#C8E7E9] bg-[#C8E7E9] text-[#066671] font-medium"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

// ─── Pill (badge nhỏ) ─────────────────────────────────────────────────────────
export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

export function IdPill({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600">
      {children}
    </span>
  );
}

// ─── States ──────────────────────────────────────────────────────────────────
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="py-8 text-center text-sm text-gray-400">{children}</div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      {children}
    </div>
  );
}
