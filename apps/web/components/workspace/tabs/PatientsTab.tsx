"use client";

import { useState } from "react";
import { usePatients } from "@/hooks/usePatients";

type Props = {
  version: number;
  active: boolean;
  role: "doctor" | "manager";
  onSelect?: (id: string) => void;
  onChanged: () => void;
};

export function PatientsTab({ version, active, role, onSelect }: Props) {
  const { data, loading, error } = usePatients(version, active);
  const [filter, setFilter] = useState("");

  const list =
    data?.patients.filter((p) => {
      const f = filter.trim().toLowerCase();
      if (!f) return true;
      return (
        p.id.toLowerCase().includes(f) ||
        p.name.toLowerCase().includes(f) ||
        p.ward.toLowerCase().includes(f) ||
        p.diagnoses.some((d) => d.toLowerCase().includes(f))
      );
    }) ?? [];

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Tìm theo tên, mã, khoa, chẩn đoán…"
          className="flex-1 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B]"
          data-agent-ref="patients:filter"
          data-agent-role="textbox"
          data-agent-label="Tìm bệnh nhân"
        />
      </div>

      {loading && (
        <div data-agent-loading="true" className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {data && (
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {list.length} / {data.count} bệnh nhân
        </div>
      )}

      <ul className="space-y-2">
        {list.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">{p.name}</div>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                {p.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {p.gender} · {p.age} tuổi · {p.ward}
            </div>
            {p.diagnoses.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.diagnoses.map((d) => (
                  <span
                    key={d}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-[#C8E7E9] text-[#087E8B]"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            {role === "doctor" && onSelect && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  data-agent-ref={`patient:${p.id}:open`}
                  data-agent-role="button"
                  data-agent-label={`Mở hồ sơ ${p.name}`}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
                >
                  Mở hồ sơ
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
