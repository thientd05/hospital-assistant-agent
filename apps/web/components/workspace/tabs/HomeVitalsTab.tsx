"use client";

import { useState } from "react";
import type { HomeVitalInput } from "@pr_hospitalagent/types";
import { useHomeVitals, homeVitalsApi } from "@/hooks/useHomeVitals";
import { formatDateTime as fmt } from "@/lib/format";
import { Field } from "../forms/Field";
import { FormHeader, FormError, FormActions } from "../forms/ui";

type Props = {
  version: number;
  active: boolean;
};

export function HomeVitalsTab({ version, active }: Props) {
  const { data, loading, error, refetch } = useHomeVitals(version, active);
  const [showForm, setShowForm] = useState(false);

  const clinical = data?.vitals ?? null;
  const history = [...(data?.homeVitals ?? [])].reverse();

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Chỉ số lâm sàng gần nhất (do bác sĩ ghi) — chỉ đọc, để tham chiếu */}
      {clinical && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">
            Chỉ số lâm sàng gần nhất (bác sĩ ghi)
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm text-gray-700">
            <span>SpO₂: {clinical.spO2 || "—"}%</span>
            <span>Nhịp tim: {clinical.heartRate || "—"} l/p</span>
            <span>Huyết áp: {clinical.bloodPressure || "—"}</span>
            <span>Nhiệt độ: {clinical.temperature || "—"}°C</span>
          </div>
          {clinical.recordedAt && (
            <div className="mt-1 text-[11px] text-gray-400">
              Lúc {fmt(clinical.recordedAt)}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {history.length} lần tự đo tại nhà
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            data-agent-ref="home-vital:create"
            data-agent-role="button"
            data-agent-label="Thêm chỉ số tại nhà"
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
          >
            + Thêm
          </button>
        )}
      </div>

      {showForm && (
        <HomeVitalForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}

      {loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {history.map((h, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 px-3 py-2.5"
          >
            <div className="text-xs text-gray-500 font-medium tabular-nums">
              {fmt(h.recordedAt)}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm text-gray-700">
              {h.spO2 !== undefined && <span>SpO₂: {h.spO2}%</span>}
              {h.heartRate !== undefined && (
                <span>Nhịp tim: {h.heartRate} l/p</span>
              )}
              {h.bloodPressure && <span>Huyết áp: {h.bloodPressure}</span>}
              {h.temperature !== undefined && (
                <span>Nhiệt độ: {h.temperature}°C</span>
              )}
            </div>
            {h.note && (
              <div className="mt-0.5 text-xs text-gray-500">{h.note}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HomeVitalForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [spO2, setSpO2] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [temperature, setTemperature] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: HomeVitalInput = {};
    if (spO2.trim()) {
      const n = Number(spO2);
      if (Number.isFinite(n)) body.spO2 = n;
    }
    if (heartRate.trim()) {
      const n = Number(heartRate);
      if (Number.isFinite(n)) body.heartRate = n;
    }
    if (bloodPressure.trim()) body.bloodPressure = bloodPressure.trim();
    if (temperature.trim()) {
      const n = Number(temperature);
      if (Number.isFinite(n)) body.temperature = n;
    }
    if (note.trim()) body.note = note.trim();

    if (
      body.spO2 === undefined &&
      body.heartRate === undefined &&
      body.bloodPressure === undefined &&
      body.temperature === undefined
    ) {
      setError("Cần nhập ít nhất một chỉ số.");
      return;
    }
    setSubmitting(true);
    try {
      await homeVitalsApi.create(body);
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
      <FormHeader title="Thêm chỉ số tại nhà" />
      <div className="p-4 space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="SpO₂ (%)">
          <input
            type="number"
            value={spO2}
            onChange={(e) => setSpO2(e.target.value)}
            className="ws-input"
            data-agent-ref="home-vital-form:spO2"
            data-agent-role="textbox"
            data-agent-label="SpO2"
          />
        </Field>
        <Field label="Nhịp tim (l/p)">
          <input
            type="number"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            className="ws-input"
            data-agent-ref="home-vital-form:heartRate"
            data-agent-role="textbox"
            data-agent-label="Nhịp tim"
          />
        </Field>
        <Field label="Huyết áp">
          <input
            value={bloodPressure}
            onChange={(e) => setBloodPressure(e.target.value)}
            placeholder="120/80"
            className="ws-input"
            data-agent-ref="home-vital-form:bloodPressure"
            data-agent-role="textbox"
            data-agent-label="Huyết áp"
          />
        </Field>
        <Field label="Nhiệt độ (°C)">
          <input
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="ws-input"
            data-agent-ref="home-vital-form:temperature"
            data-agent-role="textbox"
            data-agent-label="Nhiệt độ"
          />
        </Field>
      </div>
      <Field label="Ghi chú">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="ws-input"
          rows={2}
          data-agent-ref="home-vital-form:note"
          data-agent-role="textbox"
          data-agent-label="Ghi chú"
        />
      </Field>
      {error && (
        <FormError agentRef="home-vital-form:error" agentLabel="Lỗi form chỉ số">
          {error}
        </FormError>
      )}
      <FormActions
        onCancel={onClose}
        submitting={submitting}
        submitLabel="Lưu"
        cancelProps={{
          "data-agent-ref": "home-vital-form:cancel",
          "data-agent-role": "button",
          "data-agent-label": "Huỷ",
        }}
        submitProps={{
          "data-agent-ref": "home-vital-form:submit",
          "data-agent-role": "button",
          "data-agent-label": "Lưu chỉ số",
          "data-agent-busy": submitting ? "true" : undefined,
        }}
      />
      </div>
    </form>
  );
}
