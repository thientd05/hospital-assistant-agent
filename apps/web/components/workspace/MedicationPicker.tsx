"use client";

import { useEffect, useMemo, useState } from "react";
import type { Medication, MedicationCategory } from "@pr_hospitalagent/types";

// Thứ tự nhóm hiển thị (nhóm lạ rơi xuống cuối). Trong mỗi nhóm sắp theo TÊN.
const CATEGORY_ORDER: MedicationCategory[] = [
  "Kháng sinh",
  "Tim mạch – Huyết áp",
  "Lợi tiểu – Thận",
  "Tiểu đường",
  "Giảm đau – Hạ sốt",
  "Hô hấp",
  "Tiêu hóa",
  "Dịch truyền – Khác",
];

// Bỏ dấu để tìm kiếm không phân biệt dấu/hoa thường.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Props = {
  open: boolean;
  catalog: Medication[];
  // Tên thuốc đang kê (để tích sẵn).
  initialSelected: string[];
  onSave: (names: string[]) => void;
  onClose: () => void;
};

export function MedicationPicker({
  open,
  catalog,
  initialSelected,
  onSave,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  // Mỗi lần mở: nạp lại lựa chọn hiện tại + xoá ô tìm kiếm.
  useEffect(() => {
    if (open) {
      setSelected(new Set(initialSelected));
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Gom nhóm + sắp theo tên + lọc theo từ khoá.
  const groups = useMemo(() => {
    const q = norm(query.trim());
    const byCat = new Map<string, Medication[]>();
    for (const m of catalog) {
      if (q && !norm(m.name).includes(q)) continue;
      const arr = byCat.get(m.category) ?? [];
      arr.push(m);
      byCat.set(m.category, arr);
    }
    const order = [
      ...CATEGORY_ORDER,
      ...[...byCat.keys()].filter(
        (c) => !CATEGORY_ORDER.includes(c as MedicationCategory)
      ),
    ];
    return order
      .filter((c) => byCat.has(c))
      .map((c) => ({
        category: c,
        items: byCat
          .get(c)!
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "vi")),
      }));
  }, [catalog, query]);

  if (!open) return null;

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-[520px] max-h-[85dvh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
              Chọn thuốc
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Đã chọn {selected.size} thuốc
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-agent-ref="med-picker:cancel"
            data-agent-role="button"
            data-agent-label="Đóng form chọn thuốc"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Tìm kiếm */}
        <div className="px-4 pt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thuốc theo tên…"
            className="ws-input-sm w-full"
            data-agent-ref="med-picker:search"
            data-agent-role="textbox"
            data-agent-label="Tìm thuốc"
          />
        </div>

        {/* Danh sách thuốc theo nhóm */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {groups.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              Không tìm thấy thuốc phù hợp.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.category}>
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">
                  {g.category}
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((m) => (
                    <label
                      key={m.id}
                      className="cursor-pointer select-none"
                      title={m.name}
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={selected.has(m.name)}
                        onChange={() => toggle(m.name)}
                        data-agent-ref={`med-picker:med:${m.id}`}
                        data-agent-role="checkbox"
                        data-agent-label={m.name}
                      />
                      <span className="inline-block text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:border-[#087E8B] peer-checked:bg-[#087E8B] peer-checked:text-white peer-checked:border-[#087E8B]">
                        {m.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="ws-btn-ghost"
            data-agent-ref="med-picker:cancel-btn"
            data-agent-role="button"
            data-agent-label="Huỷ chọn thuốc"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => onSave([...selected])}
            className="ws-btn-primary"
            data-agent-ref="med-picker:save"
            data-agent-role="button"
            data-agent-label="Lưu thuốc đã chọn"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
