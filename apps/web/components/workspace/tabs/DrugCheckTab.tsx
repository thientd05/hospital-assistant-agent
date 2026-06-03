"use client";

import { useMemo, useState } from "react";
import type { Medication, MedicationCategory } from "@pr_hospitalagent/types";
import { drugCheckApi, type DrugCheckResponse } from "@/hooks/useDrugCheck";
import { useMedications } from "@/hooks/useMedications";

// Thứ tự nhóm hiển thị (giống form chọn thuốc); nhóm lạ rơi xuống cuối.
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

export function DrugCheckTab() {
  const { data, loading } = useMedications();
  const catalog: Medication[] = data?.medications ?? [];

  // Chọn theo TÊN thuốc (khớp input mà /drug-check mong đợi).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DrugCheckResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gom nhóm + sắp theo tên + lọc theo từ khoá (giống MedicationPicker).
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

  function toggle(name: string) {
    setResult(null);
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
    setResult(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (selected.size < 2) {
      setError("Chọn ít nhất 2 thuốc để kiểm tra tương tác.");
      return;
    }
    setSubmitting(true);
    try {
      // Gửi theo thứ tự catalog cho ổn định.
      const names = catalog
        .map((m) => m.name)
        .filter((n) => selected.has(n));
      const res = await drugCheckApi.check(names);
      setResult(res);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          Kiểm tra tương tác thuốc
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={clearAll}
            data-agent-ref="drug-check:clear"
            data-agent-role="button"
            data-agent-label="Bỏ chọn tất cả"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Bỏ chọn ({selected.size})
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Chọn các thuốc cần kiểm tra (ít nhất 2 thuốc) từ danh mục dưới đây.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm thuốc theo tên…"
        className="ws-input-sm w-full"
        data-agent-ref="drug-check:search"
        data-agent-role="textbox"
        data-agent-label="Tìm thuốc"
      />

      <div className="space-y-3 max-h-[40dvh] overflow-y-auto pr-1">
        {loading && catalog.length === 0 ? (
          <div className="text-sm text-gray-400 py-4">Đang tải danh mục…</div>
        ) : groups.length === 0 ? (
          <div className="text-sm text-gray-400 py-4">
            Không tìm thấy thuốc phù hợp.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.category}>
              <div className="text-[11px] font-medium text-gray-400 mb-1">
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
                      data-agent-ref={`drug-check:drug:${m.id}`}
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

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={submitting}
          data-agent-ref="drug-check:submit"
          data-agent-role="button"
          data-agent-label="Kiểm tra tương tác thuốc"
          data-agent-busy={submitting ? "true" : undefined}
          className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
        >
          {submitting ? "Đang kiểm tra…" : "Kiểm tra"}
        </button>
      </div>

      {error && (
        <div
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          data-agent-ref="drug-check:error"
          data-agent-role="alert"
          data-agent-label="Lỗi kiểm tra thuốc"
        >
          {error}
        </div>
      )}
      {result && (
        <div
          className={`rounded-md px-3 py-2 text-sm border ${
            result.hasInteraction
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          data-agent-ref="drug-check:result"
          data-agent-role="alert"
          data-agent-label="Kết quả tương tác thuốc"
        >
          <div className="font-medium mb-1">
            {result.hasInteraction
              ? "⚠ Có tương tác"
              : "✓ Không có tương tác đáng kể"}
          </div>
          <div className="text-xs opacity-70 mb-1">
            Đã kiểm tra: {result.drugs.join(", ")}
          </div>
          {result.interactions.map((m, i) => (
            <div key={i} className="text-sm">
              {m}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
