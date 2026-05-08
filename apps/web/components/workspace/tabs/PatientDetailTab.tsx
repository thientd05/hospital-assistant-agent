"use client";

import { useEffect, useState } from "react";
import type { PatientPublic } from "@pr_hospitalagent/types";
import { usePatient, patientsApi } from "@/hooks/usePatients";

type Props = {
  patientId: string | null;
  version: number;
  active: boolean;
  onChanged: () => void;
};

type Draft = {
  name: string;
  age: string;
  gender: "Nam" | "Nữ";
  ward: string;
  diagnoses: string;
  medications: string;
  spO2: string;
  heartRate: string;
  bloodPressure: string;
  temperature: string;
};

function toDraft(p: PatientPublic): Draft {
  return {
    name: p.name,
    age: String(p.age),
    gender: p.gender,
    ward: p.ward,
    diagnoses: p.diagnoses.join(", "),
    medications: p.medications.join(", "),
    spO2: String(p.vitals.spO2),
    heartRate: String(p.vitals.heartRate),
    bloodPressure: p.vitals.bloodPressure,
    temperature: String(p.vitals.temperature),
  };
}

function isVitalAbnormal(key: "spO2" | "heartRate", value: number) {
  if (key === "spO2") return value < 95;
  if (key === "heartRate") return value > 100 || value < 60;
  return false;
}

export function PatientDetailTab({
  patientId,
  version,
  active,
  onChanged,
}: Props) {
  const { data, loading, error, refetch } = usePatient(
    patientId,
    version,
    active
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setEditError(null);
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chọn một bệnh nhân từ tab <span className="font-medium">Bệnh nhân</span>{" "}
        để xem hồ sơ.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">Đang tải…</div>
    );
  }
  if (error) {
    return (
      <div className="px-5 py-4 text-sm text-red-600">
        {error}
      </div>
    );
  }
  if (!data) return null;

  function startEdit() {
    if (!data) return;
    setDraft(toDraft(data));
    setEditError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setEditError(null);
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!draft || !data) return;
    const ageNum = Number(draft.age);
    if (
      !draft.name.trim() ||
      !draft.ward.trim() ||
      !Number.isInteger(ageNum) ||
      ageNum < 0
    ) {
      setEditError(
        "Vui lòng nhập đủ Họ tên, Tuổi (số nguyên ≥ 0), Khoa/phòng."
      );
      return;
    }
    const spO2Num = Number(draft.spO2);
    const heartRateNum = Number(draft.heartRate);
    const temperatureNum = Number(draft.temperature);
    if (
      !Number.isFinite(spO2Num) ||
      !Number.isFinite(heartRateNum) ||
      !Number.isFinite(temperatureNum)
    ) {
      setEditError("Sinh hiệu phải là số hợp lệ.");
      return;
    }
    const body = {
      name: draft.name.trim(),
      age: ageNum,
      gender: draft.gender,
      ward: draft.ward.trim(),
      diagnoses: draft.diagnoses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      medications: draft.medications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      vitals: {
        spO2: spO2Num,
        heartRate: heartRateNum,
        bloodPressure: draft.bloodPressure.trim(),
        temperature: temperatureNum,
      },
    };
    setSubmitting(true);
    setEditError(null);
    try {
      await patientsApi.update(data.id, body);
      setEditing(false);
      setDraft(null);
      refetch();
      onChanged();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold text-gray-900">{data.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {data.gender} · {data.age} tuổi · {data.ward}
          </div>
        </div>
        {editing ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              className="text-[11px] px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="text-[11px] px-2.5 py-1 rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {submitting ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="text-[11px] px-2.5 py-1 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            Sửa
          </button>
        )}
      </div>

      <SectionLabel>Thông tin</SectionLabel>
      {editing && draft ? (
        <>
          <EditRow label="Họ tên">
            <input
              value={draft.name}
              onChange={(e) => updateDraft("name", e.target.value)}
              className="edit-input"
            />
          </EditRow>
          <EditRow label="Tuổi">
            <input
              type="number"
              min={0}
              value={draft.age}
              onChange={(e) => updateDraft("age", e.target.value)}
              className="edit-input"
            />
          </EditRow>
          <EditRow label="Giới tính">
            <select
              value={draft.gender}
              onChange={(e) =>
                updateDraft("gender", e.target.value as "Nam" | "Nữ")
              }
              className="edit-input"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </EditRow>
          <EditRow label="Mã BN">
            <span className="text-gray-900 font-medium text-right">
              {data.id}
            </span>
          </EditRow>
          <EditRow label="Khoa">
            <input
              value={draft.ward}
              onChange={(e) => updateDraft("ward", e.target.value)}
              className="edit-input"
            />
          </EditRow>
        </>
      ) : (
        <>
          <Row label="Họ tên" value={data.name} />
          <Row label="Tuổi / Giới" value={`${data.age} / ${data.gender}`} />
          <Row label="Mã BN" value={data.id} />
          <Row label="Khoa" value={data.ward} />
        </>
      )}

      <SectionLabel>Sinh hiệu</SectionLabel>
      {editing && draft ? (
        <>
          <EditRow label="SpO2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={draft.spO2}
                onChange={(e) => updateDraft("spO2", e.target.value)}
                className="edit-input w-24 text-right"
              />
              <span className="text-xs text-gray-500 w-10 shrink-0">%</span>
            </div>
          </EditRow>
          <EditRow label="Nhịp tim">
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={draft.heartRate}
                onChange={(e) => updateDraft("heartRate", e.target.value)}
                className="edit-input w-24 text-right"
              />
              <span className="text-xs text-gray-500 w-10 shrink-0">bpm</span>
            </div>
          </EditRow>
          <EditRow label="Huyết áp">
            <div className="flex items-center gap-1">
              <input
                value={draft.bloodPressure}
                onChange={(e) => updateDraft("bloodPressure", e.target.value)}
                placeholder="120/80"
                className="edit-input w-24 text-right"
              />
              <span className="text-xs text-gray-500 w-10 shrink-0">mmHg</span>
            </div>
          </EditRow>
          <EditRow label="Nhiệt độ">
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={draft.temperature}
                onChange={(e) => updateDraft("temperature", e.target.value)}
                className="edit-input w-24 text-right"
              />
              <span className="text-xs text-gray-500 w-10 shrink-0">°C</span>
            </div>
          </EditRow>
        </>
      ) : (
        <>
          <VitalRow
            label="SpO2"
            value={data.vitals.spO2}
            unit="%"
            abnormal={isVitalAbnormal("spO2", data.vitals.spO2)}
          />
          <VitalRow
            label="Nhịp tim"
            value={data.vitals.heartRate}
            unit="bpm"
            abnormal={isVitalAbnormal("heartRate", data.vitals.heartRate)}
          />
          <VitalRow
            label="Huyết áp"
            value={data.vitals.bloodPressure}
            unit="mmHg"
          />
          <VitalRow label="Nhiệt độ" value={data.vitals.temperature} unit="°C" />
        </>
      )}

      <SectionLabel>Chẩn đoán</SectionLabel>
      {editing && draft ? (
        <input
          value={draft.diagnoses}
          onChange={(e) => updateDraft("diagnoses", e.target.value)}
          placeholder="Phân tách bằng dấu phẩy"
          className="edit-input w-full"
        />
      ) : data.diagnoses.length === 0 ? (
        <div className="text-xs text-gray-400">Chưa có chẩn đoán.</div>
      ) : (
        <ul className="space-y-1">
          {data.diagnoses.map((d) => (
            <li key={d} className="text-gray-900">
              • {d}
            </li>
          ))}
        </ul>
      )}

      <SectionLabel>Thuốc</SectionLabel>
      {editing && draft ? (
        <input
          value={draft.medications}
          onChange={(e) => updateDraft("medications", e.target.value)}
          placeholder="Phân tách bằng dấu phẩy"
          className="edit-input w-full"
        />
      ) : data.medications.length === 0 ? (
        <div className="text-xs text-gray-400">Chưa kê thuốc.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data.medications.map((m) => (
            <span
              key={m}
              className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-800"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {editing && editError && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {editError}
        </div>
      )}

      <style jsx>{`
        :global(.edit-input) {
          font-size: 0.875rem;
          border: 1px solid rgb(229 231 235);
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
          outline: none;
          background: white;
        }
        :global(.edit-input:focus) {
          border-color: rgb(168 85 247);
        }
      `}</style>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mt-5 mb-2">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}

function EditRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-1 gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function VitalRow({
  label,
  value,
  abnormal,
  unit,
}: {
  label: string;
  value: string | number;
  abnormal?: boolean;
  unit?: string;
}) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span
        className={
          abnormal
            ? "px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-xs"
            : "text-gray-900 font-medium"
        }
      >
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}
