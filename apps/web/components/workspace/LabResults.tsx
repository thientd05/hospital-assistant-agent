"use client";

import type { LabResult } from "@pr_hospitalagent/types";

type Props = {
  results: LabResult[];
  patientId?: string | null;
  patientName?: string | null;
};

export function LabResults({ results, patientId, patientName }: Props) {
  if (!results || results.length === 0) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chưa có kết quả xét nghiệm.
      </div>
    );
  }
  return (
    <div className="px-5 py-4 text-sm">
      {patientId && (
        <div className="pb-3 mb-3 border-b border-gray-200">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
            Bệnh nhân
          </div>
          <div className="text-sm text-gray-900 font-medium">
            {patientName ? `${patientName} · ${patientId}` : patientId}
          </div>
        </div>
      )}
      <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-gray-400 font-medium pb-2 border-b border-gray-200">
        <div className="col-span-4">Xét nghiệm</div>
        <div className="col-span-2">Kết quả</div>
        <div className="col-span-2">Đơn vị</div>
        <div className="col-span-4">Tham chiếu</div>
      </div>
      <div className="divide-y divide-gray-100">
        {results.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className={`grid grid-cols-12 py-2 items-center ${
              r.isAbnormal ? "bg-red-50/60 -mx-2 px-2 rounded" : ""
            }`}
          >
            <div className="col-span-4 text-gray-800 truncate">{r.name}</div>
            <div
              className={`col-span-2 font-medium truncate ${
                r.isAbnormal ? "text-red-700" : "text-gray-900"
              }`}
            >
              {r.value}
            </div>
            <div className="col-span-2 text-gray-500 truncate">
              {r.unit || "—"}
            </div>
            <div className="col-span-4 flex items-center justify-between gap-2 min-w-0">
              <span className="text-gray-500 text-xs truncate">
                {r.referenceRange}
              </span>
              <span
                className={
                  r.isAbnormal
                    ? "text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700"
                    : "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700"
                }
              >
                {r.isAbnormal ? "Bất thường" : "Bình thường"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
