"use client";

export type PatientListItem = {
  id: string;
  name: string;
  age: number;
  gender: "Nam" | "Nữ";
  ward: string;
  diagnoses: string[];
};

export type PatientListData = {
  count: number;
  patients: PatientListItem[];
};

type Props = {
  data: PatientListData | null;
  onViewDetail?: (id: string) => void;
  disabled?: boolean;
};

export function PatientList({ data, onViewDetail, disabled }: Props) {
  if (!data || data.patients.length === 0) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chưa có bệnh nhân nào.
      </div>
    );
  }
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {data.count} bệnh nhân
      </div>
      <ul className="space-y-2">
        {data.patients.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">
                {p.name}
              </div>
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
                    className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-800"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            {onViewDetail && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onViewDetail(p.id)}
                  disabled={disabled}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
