"use client";

import type { Patient } from "@pr_hospitalagent/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mt-5 mb-2">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}

function isVitalAbnormal(key: "spO2" | "heartRate", value: number) {
  if (key === "spO2") return value < 95;
  if (key === "heartRate") return value > 100 || value < 60;
  return false;
}

function VitalRow({
  label,
  value,
  abnormal,
  unit,
}: {
  label: string;
  value: string | number;
  abnormal?: boolean;
  unit?: string;
}) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span
        className={
          abnormal
            ? "px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-xs"
            : "text-gray-900 font-medium"
        }
      >
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

type Props = { patient: Patient };

export function PatientRecord({ patient }: Props) {
  return (
    <div className="px-5 py-4 text-sm">
      <div className="text-lg font-semibold text-gray-900">{patient.name}</div>
      <div className="text-xs text-gray-500 mt-0.5">
        {patient.gender} · {patient.age} tuổi · {patient.ward}
      </div>

      <SectionLabel>Thông tin</SectionLabel>
      <Row label="Họ tên" value={patient.name} />
      <Row label="Tuổi / Giới" value={`${patient.age} / ${patient.gender}`} />
      <Row label="Mã BN" value={patient.id} />
      <Row label="Khoa" value={patient.ward} />

      <SectionLabel>Sinh hiệu</SectionLabel>
      <VitalRow
        label="SpO2"
        value={patient.vitals.spO2}
        unit="%"
        abnormal={isVitalAbnormal("spO2", patient.vitals.spO2)}
      />
      <VitalRow
        label="Nhịp tim"
        value={patient.vitals.heartRate}
        unit="bpm"
        abnormal={isVitalAbnormal("heartRate", patient.vitals.heartRate)}
      />
      <VitalRow label="Huyết áp" value={patient.vitals.bloodPressure} unit="mmHg" />
      <VitalRow label="Nhiệt độ" value={patient.vitals.temperature} unit="°C" />

      <SectionLabel>Chẩn đoán</SectionLabel>
      <ul className="space-y-1">
        {patient.diagnoses.map((d) => (
          <li key={d} className="text-gray-900">
            • {d}
          </li>
        ))}
      </ul>

      <SectionLabel>Xét nghiệm</SectionLabel>
      <div className="space-y-1.5">
        {patient.labResults.map((lab, i) => (
          <div
            key={`${lab.name}-${i}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-gray-600 truncate">{lab.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={
                  lab.isAbnormal
                    ? "text-red-700 font-medium"
                    : "text-gray-900 font-medium"
                }
              >
                {lab.value}
                {lab.unit ? ` ${lab.unit}` : ""}
              </span>
              <span
                className={
                  lab.isAbnormal
                    ? "text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700"
                    : "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700"
                }
              >
                {lab.isAbnormal ? "Bất thường" : "Bình thường"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Thuốc</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {patient.medications.map((m) => (
          <span
            key={m}
            className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-800"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
