"use client";

import type { DoctorPublic } from "@pr_hospitalagent/types";

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

type Props = { doctor: DoctorPublic };

export function DoctorRecord({ doctor }: Props) {
  const created =
    doctor.createdAt instanceof Date
      ? doctor.createdAt
      : new Date(doctor.createdAt);
  return (
    <div className="px-5 py-4 text-sm">
      <div className="text-lg font-semibold text-gray-900">
        {doctor.title} {doctor.fullName}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
        {doctor.department} · {doctor.specialty}
      </div>

      <SectionLabel>Thông tin</SectionLabel>
      <Row label="Mã bác sĩ" value={doctor.id} />
      <Row label="Họ tên" value={doctor.fullName} />
      <Row label="Chức danh" value={doctor.title} />
      <Row label="Khoa" value={doctor.department} />
      <Row label="Chuyên môn" value={doctor.specialty} />

      <SectionLabel>Liên hệ</SectionLabel>
      <Row label="Điện thoại" value={doctor.phone} />
      <Row label="Email" value={doctor.email} />
      <Row label="Địa chỉ" value={doctor.address} />

      <SectionLabel>Hệ thống</SectionLabel>
      <Row label="Tài khoản" value={doctor.username} />
      <Row label="Workspace" value={doctor.workspaceDir} />
      <Row
        label="Ngày tạo"
        value={
          isNaN(created.getTime())
            ? String(doctor.createdAt)
            : created.toLocaleDateString("vi-VN")
        }
      />
    </div>
  );
}
