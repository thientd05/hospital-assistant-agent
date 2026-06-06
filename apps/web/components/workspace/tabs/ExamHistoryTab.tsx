"use client";

import { useState } from "react";
import { useExamHistory } from "@/hooks/useExamHistory";
import { formatDate } from "@/lib/format";

type Props = {
  patientId: string | null;
  version: number;
  active: boolean;
};

export function ExamHistoryTab({ patientId, version, active }: Props) {
  const { data, loading, error } = useExamHistory(patientId, version, active);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!patientId) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Chọn một bệnh nhân ở tab <b>Bệnh nhân</b> để xem lịch sử khám.
      </div>
    );
  }
  if (loading && !data) {
    return <div className="p-6 text-sm text-gray-400">Đang tải…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-600">Lỗi tải lịch sử: {error}</div>;
  }

  const records = data?.records ?? [];
  if (records.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Bệnh nhân chưa có lịch sử khám nào được ghi nhận.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-gray-500">
        {records.length} lần khám — mới nhất trước
      </div>
      {records.map((r) => {
        const open = openId === r.id;
        return (
          <div
            key={r.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : r.id)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">
                  {formatDate(r.examDate)}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {r.doctorName}
                    {r.ward ? ` · ${r.ward}` : ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-600 truncate">
                  HA {r.vitals.bloodPressure || "—"} · Nhịp{" "}
                  {r.vitals.heartRate || "—"} · SpO2 {r.vitals.spO2 || "—"}%
                </div>
                {r.diagnoses.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.diagnoses.map((d, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-800 rounded px-1.5 py-0.5"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-gray-400 text-sm shrink-0">
                {open ? "▾" : "▸"}
              </span>
            </button>

            {open && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">
                    Sinh hiệu
                  </div>
                  <div className="text-gray-700">
                    Huyết áp {r.vitals.bloodPressure || "—"} · Nhịp tim{" "}
                    {r.vitals.heartRate || "—"} l/p · SpO2 {r.vitals.spO2 || "—"}
                    % · Nhiệt độ {r.vitals.temperature || "—"}°C
                  </div>
                </div>
                {r.medications.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">
                      Thuốc
                    </div>
                    <ul className="space-y-0.5 text-gray-700">
                      {r.medications.map((m, i) => (
                        <li key={i}>
                          💊 <b>{m.name}</b>
                          {m.instruction ? ` — ${m.instruction}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.labResults.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">
                      Xét nghiệm
                    </div>
                    <ul className="space-y-0.5">
                      {r.labResults.map((l, i) => (
                        <li
                          key={i}
                          className={
                            l.isAbnormal ? "text-red-700" : "text-gray-700"
                          }
                        >
                          {l.name}: <b>{l.value}</b> {l.unit}
                          {l.referenceRange ? ` (${l.referenceRange})` : ""}
                          {l.isAbnormal ? " ⚠" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
