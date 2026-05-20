"use client";

import { useState } from "react";
import type { LabResult } from "@pr_hospitalagent/types";
import { useLabs, patientsApi } from "@/hooks/usePatients";
import { ConfirmModal } from "@/components/sidebar/ConfirmModal";

type Props = {
  patientId: string | null;
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function LabsTab({ patientId, version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useLabs(patientId, version, active);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);

  if (!patientId) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chọn một bệnh nhân từ tab <span className="font-medium">Bệnh nhân</span>{" "}
        để xem xét nghiệm.
      </div>
    );
  }
  if (loading)
    return <div className="px-5 py-8 text-sm text-gray-400 text-center">Đang tải…</div>;
  if (error)
    return <div className="px-5 py-4 text-sm text-red-600">{error}</div>;
  if (!data) return null;

  async function confirmRemove() {
    if (confirmIdx === null) return;
    const idx = confirmIdx;
    setBusy(idx);
    try {
      await patientsApi.removeLab(patientId!, idx);
      setConfirmIdx(null);
      refetch();
      onChanged();
    } catch (e) {
      alert(`Xoá lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5 py-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
            Bệnh nhân
          </div>
          <div className="text-sm text-gray-900 font-medium">
            {data.patientName} · {data.patientId}
          </div>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            data-agent-ref="lab:add"
            data-agent-role="button"
            data-agent-label="Thêm xét nghiệm"
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
          >
            + Thêm
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-3">
          <LabAddForm
            patientId={patientId}
            onClose={() => setShowAdd(false)}
            onSaved={() => {
              setShowAdd(false);
              refetch();
              onChanged();
            }}
          />
        </div>
      )}

      {data.labResults.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-6">
          Chưa có kết quả xét nghiệm.
        </div>
      ) : (
        <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-gray-400 font-medium pb-2 border-b border-gray-200">
          <div className="col-span-4">Xét nghiệm</div>
          <div className="col-span-2">Kết quả</div>
          <div className="col-span-2">Đơn vị</div>
          <div className="col-span-2">Tham chiếu</div>
          <div className="col-span-2"></div>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {data.labResults.map((r, i) => (
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
            <div className="col-span-2 text-gray-500 text-xs truncate">
              {r.referenceRange}
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmIdx(i)}
                disabled={busy === i}
                data-agent-ref={`lab:${i}:delete`}
                data-agent-role="button"
                data-agent-label={`Xoá xét nghiệm ${r.name}`}
                className="text-[11px] px-2.5 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy === i ? "Đang xoá…" : "Xoá"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={confirmIdx !== null}
        title="Xoá kết quả xét nghiệm"
        message={
          confirmIdx !== null
            ? `Bạn có chắc muốn xoá kết quả #${confirmIdx + 1}${
                data.labResults[confirmIdx]?.name
                  ? ` (${data.labResults[confirmIdx].name})`
                  : ""
              }?`
            : ""
        }
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        busy={busy !== null && busy === confirmIdx}
        onConfirm={confirmRemove}
        onCancel={() => setConfirmIdx(null)}
      />
    </div>
  );
}

function LabAddForm({
  patientId,
  onClose,
  onSaved,
}: {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !unit.trim() || !referenceRange.trim() || !value) {
      setError("Cần nhập đủ các trường.");
      return;
    }
    const numeric = Number(value);
    const lab: LabResult = {
      name: name.trim(),
      value: Number.isFinite(numeric) && value.trim() !== "" ? numeric : value,
      unit: unit.trim(),
      referenceRange: referenceRange.trim(),
      isAbnormal,
      recordedAt: new Date(),
    };
    setSubmitting(true);
    try {
      await patientsApi.addLab(patientId, lab);
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-gray-900">
        Thêm xét nghiệm
      </h3>
      <Lbl label="Tên xét nghiệm">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          required
          data-agent-ref="lab-form:name"
          data-agent-role="textbox"
          data-agent-label="Tên xét nghiệm"
        />
      </Lbl>
      <div className="grid grid-cols-2 gap-3">
        <Lbl label="Kết quả">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input"
            required
            data-agent-ref="lab-form:value"
            data-agent-role="textbox"
            data-agent-label="Kết quả"
          />
        </Lbl>
        <Lbl label="Đơn vị">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="input"
            required
            data-agent-ref="lab-form:unit"
            data-agent-role="textbox"
            data-agent-label="Đơn vị"
          />
        </Lbl>
      </div>
      <Lbl label="Khoảng tham chiếu">
        <input
          value={referenceRange}
          onChange={(e) => setReferenceRange(e.target.value)}
          className="input"
          required
          data-agent-ref="lab-form:referenceRange"
          data-agent-role="textbox"
          data-agent-label="Khoảng tham chiếu"
        />
      </Lbl>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isAbnormal}
          onChange={(e) => setIsAbnormal(e.target.checked)}
          data-agent-ref="lab-form:isAbnormal"
          data-agent-role="checkbox"
          data-agent-label="Bất thường"
        />
        Bất thường
      </label>
      {error && (
        <div
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          data-agent-ref="lab-form:error"
          data-agent-role="alert"
          data-agent-label="Lỗi form xét nghiệm"
        >
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          data-agent-ref="lab-form:cancel"
          data-agent-role="button"
          data-agent-label="Huỷ"
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={submitting}
          data-agent-ref="lab-form:submit"
          data-agent-role="button"
          data-agent-label="Lưu xét nghiệm"
          data-agent-busy={submitting ? "true" : undefined}
          className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
        >
          {submitting ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          font-size: 0.875rem;
          border: 1px solid rgb(229 231 235);
          border-radius: 0.375rem;
          padding: 0.375rem 0.625rem;
          outline: none;
        }
        .input:focus {
          border-color: rgb(168 85 247);
        }
      `}</style>
    </form>
  );
}

function Lbl({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-0.5">{label}</span>
      {children}
    </label>
  );
}
