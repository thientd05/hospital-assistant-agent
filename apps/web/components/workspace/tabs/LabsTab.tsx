"use client";

import { useState } from "react";
import { LAB_CATALOG, findLabEntry } from "@pr_hospitalagent/types";
import { useLabs, patientsApi } from "@/hooks/usePatients";
import { useMyLabs } from "@/hooks/useMyLabs";
import { ConfirmModal } from "@/components/sidebar/ConfirmModal";
import { Field as Lbl } from "../forms/Field";
import { FormHeader, FormError, FormActions } from "../forms/ui";

type Props = {
  patientId: string | null;
  version: number;
  active: boolean;
  onChanged: () => void;
  // selfMode: bệnh nhân tự xem xét nghiệm CỦA MÌNH (qua /me/labs) — chỉ xem, ẩn Thêm/Xoá.
  selfMode?: boolean;
};

export function LabsTab({
  patientId,
  version,
  active,
  onChanged,
  selfMode = false,
}: Props) {
  const doctorRes = useLabs(patientId, version, active && !selfMode);
  const selfRes = useMyLabs(version, active && selfMode);
  const { data, loading, error, refetch } = selfMode ? selfRes : doctorRes;
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);

  if (!selfMode && !patientId) {
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
        {!selfMode && !showAdd && (
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

      {showAdd && patientId && (
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
          <div className={selfMode ? "col-span-5" : "col-span-4"}>Xét nghiệm</div>
          <div className="col-span-2">Kết quả</div>
          <div className="col-span-2">Đơn vị</div>
          <div className={`${selfMode ? "col-span-3" : "col-span-2"} text-center`}>
            Tham chiếu
          </div>
          {!selfMode && <div className="col-span-2"></div>}
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
            <div
              className={`${
                selfMode ? "col-span-5" : "col-span-4"
              } text-gray-800 truncate`}
            >
              {r.name}
            </div>
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
            <div
              className={`${
                selfMode ? "col-span-3" : "col-span-2"
              } text-gray-500 text-xs truncate text-center`}
            >
              {r.referenceRange}
            </div>
            {!selfMode && (
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
            )}
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entry = name ? findLabEntry(name) : undefined;
  const qualitative = entry?.normal !== undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !value.trim()) {
      setError("Chọn xét nghiệm và nhập kết quả.");
      return;
    }
    setSubmitting(true);
    try {
      // Chỉ gửi tên + kết quả; đơn vị/khoảng tham chiếu/bất thường do server suy.
      await patientsApi.addLab(patientId, { name: name.trim(), value: value.trim() });
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
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <FormHeader title="Thêm xét nghiệm" />
      <div className="p-4 space-y-3.5">
      <Lbl label="Tên xét nghiệm">
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="ws-input"
          required
          data-agent-ref="lab-form:name"
          data-agent-role="combobox"
          data-agent-label="Tên xét nghiệm"
        >
          <option value="">— Chọn xét nghiệm —</option>
          {LAB_CATALOG.map((e) => (
            <option key={e.name} value={e.name}>
              {e.name}
              {e.unit ? ` (${e.unit})` : ""}
            </option>
          ))}
        </select>
      </Lbl>
      <Lbl label={qualitative ? "Kết quả" : "Kết quả (giá trị)"}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="ws-input"
          required
          placeholder={
            entry
              ? qualitative
                ? `vd: ${entry.normal}`
                : `Đơn vị: ${entry.unit || "—"}`
              : "Chọn xét nghiệm trước"
          }
          data-agent-ref="lab-form:value"
          data-agent-role="textbox"
          data-agent-label="Kết quả"
        />
      </Lbl>
      {entry && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2 space-y-0.5">
          <div>
            Đơn vị: <span className="text-gray-700">{entry.unit || "—"}</span>
          </div>
          <div>
            Khoảng tham chiếu:{" "}
            <span className="text-gray-700">{entry.referenceRange}</span>
          </div>
          <div className="text-gray-400">
            Hệ thống tự xác định bất thường theo khoảng tham chiếu.
          </div>
        </div>
      )}
      {error && (
        <FormError agentRef="lab-form:error" agentLabel="Lỗi form xét nghiệm">
          {error}
        </FormError>
      )}
      <FormActions
        onCancel={onClose}
        submitting={submitting}
        submitLabel="Lưu"
        cancelProps={{
          "data-agent-ref": "lab-form:cancel",
          "data-agent-role": "button",
          "data-agent-label": "Huỷ",
        }}
        submitProps={{
          "data-agent-ref": "lab-form:submit",
          "data-agent-role": "button",
          "data-agent-label": "Lưu xét nghiệm",
          "data-agent-busy": submitting ? "true" : undefined,
        }}
      />
      </div>
    </form>
  );
}
