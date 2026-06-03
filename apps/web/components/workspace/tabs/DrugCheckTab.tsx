"use client";

import { useEffect, useMemo, useState } from "react";
import {
  drugCheckApi,
  type DrugCatalogItem,
  type DrugCheckResponse,
} from "@/hooks/useDrugCheck";

export function DrugCheckTab() {
  const [catalog, setCatalog] = useState<DrugCatalogItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<DrugCheckResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    drugCheckApi
      .catalog()
      .then((list) => {
        if (alive) setCatalog(list);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  // Nhóm thuốc theo danh mục, giữ thứ tự xuất hiện trong catalog.
  const groups = useMemo(() => {
    const map = new Map<string, DrugCatalogItem[]>();
    for (const d of catalog) {
      const arr = map.get(d.category) ?? [];
      arr.push(d);
      map.set(d.category, arr);
    }
    return Array.from(map.entries());
  }, [catalog]);

  function toggle(id: string) {
    setResult(null);
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      const ids = catalog.map((d) => d.id).filter((id) => selected.has(id));
      const res = await drugCheckApi.check(ids);
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
        Chọn các thuốc cần kiểm tra (ít nhất 2 thuốc) từ danh sách dưới đây.
      </p>

      <div className="space-y-3">
        {groups.map(([category, drugs]) => (
          <div key={category}>
            <div className="text-[11px] font-medium text-gray-400 mb-1">
              {category}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {drugs.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    data-agent-ref={`drug-check:drug:${d.id}`}
                    data-agent-role="checkbox"
                    data-agent-label={d.name}
                    className="accent-[#087E8B] w-4 h-4"
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
        ))}
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
