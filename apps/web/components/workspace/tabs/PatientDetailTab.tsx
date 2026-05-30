"use client";

import { useEffect, useState } from "react";
import type { PatientPublic } from "@pr_hospitalagent/types";
import { usePatient, patientsApi } from "@/hooks/usePatients";
import { useAuth } from "@/app/providers/AuthProvider";

type Props = {
  patientId: string | null;
  version: number;
  active: boolean;
  onChanged: () => void;
  // selfMode: bệnh nhân tự xem hồ sơ CỦA MÌNH (lấy từ /auth/me) — chỉ xem, ẩn nút Sửa.
  selfMode?: boolean;
};

type Draft = {
  name: string;
  age: string;
  gender: "Nam" | "Nữ";
  ward: string;
  address: string;
  phone: string;
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
    address: p.address ?? "",
    phone: p.phone ?? "",
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
  selfMode = false,
}: Props) {
  const { patient: authPatient } = useAuth();
  const fetched = usePatient(patientId, version, active && !selfMode);
  const data = selfMode ? authPatient : fetched.data;
  const loading = selfMode ? false : fetched.loading;
  const error = selfMode ? null : fetched.error;
  const refetch = fetched.refetch;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setEditError(null);
  }, [patientId]);

  if (!selfMode && !patientId) {
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
      address: draft.address.trim(),
      phone: draft.phone.trim(),
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
        {selfMode ? (
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 shrink-0">
            Chỉ xem
          </span>
        ) : editing ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              data-agent-ref="patient-detail:cancel"
              data-agent-role="button"
              data-agent-label="Huỷ sửa hồ sơ"
              className="text-[11px] px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              data-agent-ref="patient-detail:save"
              data-agent-role="button"
              data-agent-label="Lưu hồ sơ"
              data-agent-busy={submitting ? "true" : undefined}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
            >
              {submitting ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            data-agent-ref="patient-detail:edit"
            data-agent-role="button"
            data-agent-label="Sửa hồ sơ"
            className="text-[11px] px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
          >
            Sửa
          </button>
        )}
      </div>

      <SectionLabel>Thông tin</SectionLabel>
      <InfoRow label="Họ tên">
        {editing && draft ? (
          <input
            value={draft.name}
            onChange={(e) => updateDraft("name", e.target.value)}
            className={`${INLINE_INPUT} w-36`}
            data-agent-ref="patient-detail:name"
            data-agent-role="textbox"
            data-agent-label="Họ tên"
          />
        ) : (
          <ValueText>{data.name}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Tuổi">
        {editing && draft ? (
          <input
            type="number"
            min={0}
            value={draft.age}
            onChange={(e) => updateDraft("age", e.target.value)}
            className={`${INLINE_INPUT} w-10`}
            data-agent-ref="patient-detail:age"
            data-agent-role="textbox"
            data-agent-label="Tuổi"
          />
        ) : (
          <ValueText>{data.age}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Giới tính">
        {editing && draft ? (
          <select
            value={draft.gender}
            onChange={(e) =>
              updateDraft("gender", e.target.value as "Nam" | "Nữ")
            }
            className={`${INLINE_INPUT} w-24`}
            data-agent-ref="patient-detail:gender"
            data-agent-role="combobox"
            data-agent-label="Giới tính"
          >
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        ) : (
          <ValueText>{data.gender}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Mã BN">
        <ValueText>{data.id}</ValueText>
      </InfoRow>
      <InfoRow label="Khoa">
        {editing && draft ? (
          <input
            value={draft.ward}
            onChange={(e) => updateDraft("ward", e.target.value)}
            className={`${INLINE_INPUT} w-20`}
            data-agent-ref="patient-detail:ward"
            data-agent-role="textbox"
            data-agent-label="Khoa"
          />
        ) : (
          <ValueText>{data.ward || "—"}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Địa chỉ">
        {editing && draft ? (
          <input
            value={draft.address}
            onChange={(e) => updateDraft("address", e.target.value)}
            className={INLINE_INPUT}
            data-agent-ref="patient-detail:address"
            data-agent-role="textbox"
            data-agent-label="Địa chỉ"
          />
        ) : (
          <ValueText>{data.address || "—"}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Điện thoại">
        {editing && draft ? (
          <input
            value={draft.phone}
            onChange={(e) => updateDraft("phone", e.target.value)}
            className={`${INLINE_INPUT} w-28`}
            data-agent-ref="patient-detail:phone"
            data-agent-role="textbox"
            data-agent-label="Điện thoại"
          />
        ) : (
          <ValueText>{data.phone || "—"}</ValueText>
        )}
      </InfoRow>

      <SectionLabel>Sinh hiệu</SectionLabel>
      <InfoRow label="SpO2">
        {editing && draft ? (
          <>
            <input
              type="number"
              step="0.1"
              value={draft.spO2}
              onChange={(e) => updateDraft("spO2", e.target.value)}
              className={`${INLINE_INPUT} w-16`}
              data-agent-ref="patient-detail:spO2"
              data-agent-role="textbox"
              data-agent-label="SpO2"
            />
            <UnitText>%</UnitText>
          </>
        ) : (
          <VitalValue
            value={data.vitals.spO2}
            unit="%"
            abnormal={isVitalAbnormal("spO2", data.vitals.spO2)}
          />
        )}
      </InfoRow>
      <InfoRow label="Nhịp tim">
        {editing && draft ? (
          <>
            <input
              type="number"
              value={draft.heartRate}
              onChange={(e) => updateDraft("heartRate", e.target.value)}
              className={`${INLINE_INPUT} w-16`}
              data-agent-ref="patient-detail:heartRate"
              data-agent-role="textbox"
              data-agent-label="Nhịp tim"
            />
            <UnitText>bpm</UnitText>
          </>
        ) : (
          <VitalValue
            value={data.vitals.heartRate}
            unit="bpm"
            abnormal={isVitalAbnormal("heartRate", data.vitals.heartRate)}
          />
        )}
      </InfoRow>
      <InfoRow label="Huyết áp">
        {editing && draft ? (
          <>
            <input
              value={draft.bloodPressure}
              onChange={(e) => updateDraft("bloodPressure", e.target.value)}
              placeholder="120/80"
              className={`${INLINE_INPUT} w-20`}
              data-agent-ref="patient-detail:bloodPressure"
              data-agent-role="textbox"
              data-agent-label="Huyết áp"
            />
            <UnitText>mmHg</UnitText>
          </>
        ) : (
          <VitalValue value={data.vitals.bloodPressure} unit="mmHg" />
        )}
      </InfoRow>
      <InfoRow label="Nhiệt độ">
        {editing && draft ? (
          <>
            <input
              type="number"
              step="0.1"
              value={draft.temperature}
              onChange={(e) => updateDraft("temperature", e.target.value)}
              className={`${INLINE_INPUT} w-16`}
              data-agent-ref="patient-detail:temperature"
              data-agent-role="textbox"
              data-agent-label="Nhiệt độ"
            />
            <UnitText>°C</UnitText>
          </>
        ) : (
          <VitalValue value={data.vitals.temperature} unit="°C" />
        )}
      </InfoRow>

      <SectionLabel>Chẩn đoán</SectionLabel>
      {editing && draft ? (
        <input
          value={draft.diagnoses}
          onChange={(e) => updateDraft("diagnoses", e.target.value)}
          placeholder="Phân tách bằng dấu phẩy"
          className="ws-input-sm w-full"
          data-agent-ref="patient-detail:diagnoses"
          data-agent-role="textbox"
          data-agent-label="Chẩn đoán"
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
          className="ws-input-sm w-full"
          data-agent-ref="patient-detail:medications"
          data-agent-role="textbox"
          data-agent-label="Thuốc"
        />
      ) : data.medications.length === 0 ? (
        <div className="text-xs text-gray-400">Chưa kê thuốc.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data.medications.map((m) => (
            <span
              key={m}
              className="text-xs px-2 py-1 rounded-full bg-[#C8E7E9] text-[#087E8B]"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {editing && editError && (
        <div
          className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          data-agent-ref="patient-detail:error"
          data-agent-role="alert"
          data-agent-label="Lỗi sửa hồ sơ"
        >
          {editError}
        </div>
      )}
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

// Sửa tại chỗ: giữ y nguyên kiểu chữ + vị trí của giá trị, chỉ thêm gạch chân
// mờ để đánh dấu edit được — KHÔNG vẽ ô (tránh xô lệch layout).
const INLINE_INPUT =
  "min-w-0 text-right text-sm text-gray-900 font-medium bg-transparent px-0 py-0 outline-none border-0 border-b border-dashed border-gray-300 focus:border-[#087E8B]";

// Hàng nhãn-trái / giá trị (hoặc ô sửa) -phải — dùng chung cho cả xem lẫn sửa.
function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-1 gap-3">
      <span className="text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center justify-end gap-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

function ValueText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-gray-900 font-medium text-right">{children}</span>
  );
}

function UnitText({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-gray-500 shrink-0">{children}</span>;
}

function VitalValue({
  value,
  unit,
  abnormal,
}: {
  value: string | number;
  unit: string;
  abnormal?: boolean;
}) {
  return (
    <span
      className={
        abnormal
          ? "px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-xs"
          : "text-gray-900 font-medium"
      }
    >
      {value} {unit}
    </span>
  );
}
