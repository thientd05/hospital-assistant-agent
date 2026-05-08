"use client";

import { useState } from "react";
import { drugCheckApi, type DrugCheckResponse } from "@/hooks/useDrugCheck";

export function DrugCheckTab() {
  const [drugs, setDrugs] = useState("");
  const [result, setResult] = useState<DrugCheckResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const list = drugs
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      setError("Nhập ít nhất 1 thuốc.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await drugCheckApi.check(list);
      setResult(res);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        Kiểm tra tương tác thuốc
      </div>
      <form onSubmit={submit} className="space-y-2">
        <label className="block">
          <span className="block text-xs text-gray-500 mb-0.5">
            Danh sách thuốc (phân tách bằng dấu phẩy hoặc xuống dòng)
          </span>
          <textarea
            value={drugs}
            onChange={(e) => setDrugs(e.target.value)}
            rows={4}
            placeholder="VD: warfarin, aspirin"
            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B]"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
          >
            {submitting ? "Đang kiểm tra…" : "Kiểm tra"}
          </button>
        </div>
      </form>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
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
        >
          <div className="font-medium mb-1">
            {result.hasInteraction
              ? "⚠ Có tương tác"
              : "✓ Không có tương tác đáng kể"}
          </div>
          {result.interactions.map((m, i) => (
            <div key={i} className="text-sm">
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
