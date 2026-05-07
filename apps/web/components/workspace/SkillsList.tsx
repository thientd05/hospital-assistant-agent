"use client";

export type SkillsListItem = {
  name: string;
  description: string;
};

export type SkillsListData = {
  skills: SkillsListItem[];
  deleted?: string;
};

export function SkillsList({ data }: { data: SkillsListData }) {
  return (
    <div className="px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">
        Thư viện skill
      </div>
      {data.deleted && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Đã xoá skill <span className="font-mono font-medium">{data.deleted}</span>.
        </div>
      )}
      {data.skills.length === 0 ? (
        <div className="text-sm text-gray-500">
          Thư viện hiện không còn skill nào.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
          {data.skills.map((s) => (
            <li key={s.name} className="px-3 py-2.5">
              <div className="font-mono text-sm text-gray-900">{s.name}</div>
              <div className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                {s.description}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-xs text-gray-400">
        Tổng: {data.skills.length} skill
      </div>
    </div>
  );
}
