"use client";

import { useState } from "react";
import type {
  Asset,
  AssetCategory,
  AssetCondition,
} from "@pr_hospitalagent/types";
import { assetsApi } from "@/hooks/useAssets";
import { Field as Lbl } from "./Field";
import { FormModal, FormHeader, FormError, FormActions } from "./ui";

const CATEGORIES: AssetCategory[] = [
  "Thiết bị y tế",
  "Nội thất",
  "Máy tính",
  "Khác",
];
const CONDITIONS: AssetCondition[] = ["Tốt", "Bình thường", "Cần sửa", "Hỏng"];

function toDateInput(d: Date | string | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  initial?: Partial<Asset>;
  editId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function AssetForm({ initial, editId, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<AssetCategory>(
    (initial?.category as AssetCategory) ?? "Thiết bị y tế"
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [purchaseDate, setPurchaseDate] = useState(
    toDateInput(initial?.purchaseDate)
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initial?.purchasePrice ? String(initial.purchasePrice) : ""
  );
  const [depreciationYears, setDepreciationYears] = useState(
    initial?.depreciationYears ? String(initial.depreciationYears) : "5"
  );
  const [condition, setCondition] = useState<AssetCondition>(
    (initial?.condition as AssetCondition) ?? "Tốt"
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !name.trim() ||
      !location.trim() ||
      !purchaseDate ||
      !purchasePrice.trim() ||
      !depreciationYears.trim()
    ) {
      setError("Cần nhập đủ các trường bắt buộc.");
      return;
    }
    const price = Number(purchasePrice);
    const years = Number(depreciationYears);
    if (!Number.isFinite(price) || price < 0) {
      setError("Giá trị mua không hợp lệ.");
      return;
    }
    if (!Number.isFinite(years) || years < 0) {
      setError("Số năm khấu hao không hợp lệ.");
      return;
    }
    const body = {
      name: name.trim(),
      category,
      location: location.trim(),
      purchaseDate,
      purchasePrice: price,
      depreciationYears: years,
      condition,
      notes: notes.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editId) {
        await assetsApi.update(editId, body);
      } else {
        await assetsApi.create(body);
      }
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal maxWidth={500}>
      <form onSubmit={submit}>
        <FormHeader title={editId ? `Sửa tài sản ${editId}` : "Thêm tài sản"} />
        <div className="p-4 space-y-3.5">
        <Lbl label="Tên tài sản">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ws-input"
            required
          />
        </Lbl>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Loại">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="ws-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl label="Tình trạng">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className="ws-input"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Lbl>
        </div>
        <Lbl label="Vị trí">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="ws-input"
            required
          />
        </Lbl>
        <div className="grid grid-cols-3 gap-3">
          <Lbl label="Ngày mua">
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Giá trị (VND)">
            <input
              type="number"
              min={0}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Khấu hao (năm)">
            <input
              type="number"
              min={0}
              value={depreciationYears}
              onChange={(e) => setDepreciationYears(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
        </div>
        <Lbl label="Ghi chú">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="ws-input"
            rows={2}
          />
        </Lbl>
        {error && <FormError>{error}</FormError>}
        <FormActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel={editId ? "Lưu" : "Tạo"}
        />
        </div>
      </form>
    </FormModal>
  );
}
