"use client";

export type ExpertListItem = {
  id: string;
  fullName: string;
  title: string;
  expertise: string;
  phone: string;
  email: string;
};

export type ExpertListData = {
  count: number;
  experts: ExpertListItem[];
};

type Props = {
  data: ExpertListData | null;
  onViewDetail?: (id: string) => void;
  disabled?: boolean;
};

export function ExpertList({ data, onViewDetail, disabled }: Props) {
  if (!data || data.experts.length === 0) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chưa có chuyên gia nào.
      </div>
    );
  }
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {data.count} chuyên gia
      </div>
      <ul className="space-y-2">
        {data.experts.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">
                {e.title} {e.fullName}
              </div>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                {e.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{e.expertise}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              {e.phone && <span>📞 {e.phone}</span>}
              {e.email && <span>✉ {e.email}</span>}
            </div>
            {onViewDetail && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onViewDetail(e.id)}
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
