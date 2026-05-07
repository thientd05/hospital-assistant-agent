"use client";

import type { ExpertPublic } from "@pr_hospitalagent/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mt-5 mb-2">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right break-all">
        {value}
      </span>
    </div>
  );
}

type Props = { expert: ExpertPublic };

export function ExpertRecord({ expert }: Props) {
  const created =
    expert.createdAt instanceof Date
      ? expert.createdAt
      : new Date(expert.createdAt);
  return (
    <div className="px-5 py-4 text-sm">
      <div className="text-lg font-semibold text-gray-900">
        {expert.title} {expert.fullName}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{expert.expertise}</div>

      <SectionLabel>Thông tin</SectionLabel>
      <Row label="Mã chuyên gia" value={expert.id} />
      <Row label="Họ tên" value={expert.fullName} />
      <Row label="Chức danh" value={expert.title} />
      <Row label="Lĩnh vực" value={expert.expertise} />

      <SectionLabel>Liên hệ</SectionLabel>
      <Row label="Điện thoại" value={expert.phone} />
      <Row label="Email" value={expert.email} />
      <Row label="Địa chỉ" value={expert.address} />

      <SectionLabel>Hệ thống</SectionLabel>
      <Row label="Tài khoản" value={expert.username} />
      <Row
        label="Ngày tạo"
        value={
          isNaN(created.getTime())
            ? String(expert.createdAt)
            : created.toLocaleDateString("vi-VN")
        }
      />
    </div>
  );
}
