"use client";

import type { AppointmentStatus } from "@pr_hospitalagent/types";

export type CustomerStatsData = {
  patients: {
    total: number;
    byGender: Record<string, number>;
    byAgeGroup: Record<"0-17" | "18-39" | "40-59" | "60+", number>;
    byWard: Array<{ ward: string; count: number }>;
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
    withAbnormalLab: number;
  };
  appointments: {
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    byDoctor: Array<{
      doctorId: string;
      doctorName: string | null;
      count: number;
    }>;
  };
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Chờ duyệt": "bg-amber-50 text-amber-700 ring-amber-200",
  "Đã duyệt": "bg-blue-50 text-blue-700 ring-blue-200",
  "Thành công": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const AGE_GROUPS: Array<keyof CustomerStatsData["patients"]["byAgeGroup"]> = [
  "0-17",
  "18-39",
  "40-59",
  "60+",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">
      {children}
    </div>
  );
}

function Bar({
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
        <span className="text-gray-700 truncate">{label}</span>
        <span className="text-gray-500 tabular-nums shrink-0">
          {rightLabel ?? `${value} · ${pct}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-purple-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

type Props = {
  data: CustomerStatsData | null;
};

export function CustomerStats({ data }: Props) {
  if (!data) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chưa có dữ liệu thống kê.
      </div>
    );
  }

  const { patients, appointments } = data;
  const genderEntries = Object.entries(patients.byGender);
  const statusEntries = Object.entries(appointments.byStatus) as Array<
    [AppointmentStatus, number]
  >;

  return (
    <div className="px-5 py-4 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
            Bệnh nhân
          </div>
          <div className="mt-0.5 text-2xl font-semibold text-gray-900 tabular-nums">
            {patients.total}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
            Cuộc hẹn
          </div>
          <div className="mt-0.5 text-2xl font-semibold text-gray-900 tabular-nums">
            {appointments.total}
          </div>
        </div>
      </div>

      {genderEntries.length > 0 && (
        <section>
          <SectionTitle>Theo giới tính</SectionTitle>
          <ul className="space-y-2">
            {genderEntries.map(([gender, count]) => (
              <Bar
                key={gender}
                label={gender}
                value={count}
                total={patients.total}
              />
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Theo độ tuổi</SectionTitle>
        <ul className="space-y-2">
          {AGE_GROUPS.map((group) => (
            <Bar
              key={group}
              label={group}
              value={patients.byAgeGroup[group] ?? 0}
              total={patients.total}
            />
          ))}
        </ul>
      </section>

      {patients.byWard.length > 0 && (
        <section>
          <SectionTitle>Khoa / phòng</SectionTitle>
          <ul className="space-y-2">
            {patients.byWard.map((w) => (
              <Bar
                key={w.ward}
                label={w.ward}
                value={w.count}
                total={patients.total}
              />
            ))}
          </ul>
        </section>
      )}

      {patients.topDiagnoses.length > 0 && (
        <section>
          <SectionTitle>Top chẩn đoán</SectionTitle>
          <ul className="space-y-2">
            {patients.topDiagnoses.map((d) => (
              <Bar
                key={d.diagnosis}
                label={d.diagnosis}
                value={d.count}
                total={patients.total}
                rightLabel={`${d.count} BN`}
              />
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Xét nghiệm bất thường</SectionTitle>
        <div className="text-sm text-gray-700">
          <span className="font-semibold tabular-nums">
            {patients.withAbnormalLab}
          </span>
          <span className="text-gray-500">
            {" / "}
            {patients.total} bệnh nhân có ít nhất 1 chỉ số bất thường
          </span>
        </div>
      </section>

      {statusEntries.length > 0 && (
        <section>
          <SectionTitle>Cuộc hẹn theo trạng thái</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {statusEntries.map(([status, count]) => (
              <span
                key={status}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_STYLES[status]}`}
              >
                {status} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {appointments.byDoctor.length > 0 && (
        <section>
          <SectionTitle>Cuộc hẹn theo bác sĩ</SectionTitle>
          <ul className="space-y-2">
            {appointments.byDoctor.map((d) => (
              <Bar
                key={d.doctorId}
                label={d.doctorName ?? d.doctorId}
                value={d.count}
                total={appointments.total}
                rightLabel={`${d.count}`}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
