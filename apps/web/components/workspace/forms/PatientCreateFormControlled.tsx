"use client";

import type { PatientFormValues } from "@/hooks/useWorkspace";

type Props = {
  values: PatientFormValues;
  submitting: boolean;
  error: string | null;
  onChange: <K extends keyof PatientFormValues>(
    key: K,
    value: PatientFormValues[K]
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function PatientCreateFormControlled({
  values,
  submitting,
  error,
  onChange,
  onClose,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-gray-900">
        Tạo bệnh nhân mới
      </h3>
      <Field label="Họ tên">
        <input
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          className="input"
          data-agent-ref="patient-form:name"
          data-agent-role="textbox"
          data-agent-label="Họ tên"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tuổi">
          <input
            type="text"
            inputMode="numeric"
            value={values.age}
            onChange={(e) => onChange("age", e.target.value)}
            className="input"
            data-agent-ref="patient-form:age"
            data-agent-role="textbox"
            data-agent-label="Tuổi"
          />
        </Field>
        <Field label="Giới tính">
          <select
            value={values.gender}
            onChange={(e) =>
              onChange("gender", e.target.value as "Nam" | "Nữ")
            }
            className="input"
            data-agent-ref="patient-form:gender"
            data-agent-role="combobox"
            data-agent-label="Giới tính"
          >
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </Field>
      </div>
      <Field label="Khoa / phòng">
        <input
          value={values.ward}
          onChange={(e) => onChange("ward", e.target.value)}
          className="input"
          data-agent-ref="patient-form:ward"
          data-agent-role="textbox"
          data-agent-label="Khoa / phòng"
        />
      </Field>
      <Field label="Thuốc (phân tách bằng dấu phẩy)">
        <input
          value={values.medications}
          onChange={(e) => onChange("medications", e.target.value)}
          className="input"
          data-agent-ref="patient-form:medications"
          data-agent-role="textbox"
          data-agent-label="Thuốc"
        />
      </Field>

      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium pt-1">
        Sinh hiệu (tuỳ chọn)
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SpO2 (%)">
          <input
            type="text"
            inputMode="numeric"
            value={values.spO2}
            onChange={(e) => onChange("spO2", e.target.value)}
            className="input"
            data-agent-ref="patient-form:spO2"
            data-agent-role="textbox"
            data-agent-label="SpO2 (%)"
          />
        </Field>
        <Field label="Nhịp tim (bpm)">
          <input
            type="text"
            inputMode="numeric"
            value={values.heartRate}
            onChange={(e) => onChange("heartRate", e.target.value)}
            className="input"
            data-agent-ref="patient-form:heartRate"
            data-agent-role="textbox"
            data-agent-label="Nhịp tim (bpm)"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Huyết áp (mmHg)">
          <input
            value={values.bloodPressure}
            onChange={(e) => onChange("bloodPressure", e.target.value)}
            placeholder="120/80"
            className="input"
            data-agent-ref="patient-form:bloodPressure"
            data-agent-role="textbox"
            data-agent-label="Huyết áp (mmHg)"
          />
        </Field>
        <Field label="Nhiệt độ (°C)">
          <input
            type="text"
            inputMode="decimal"
            value={values.temperature}
            onChange={(e) => onChange("temperature", e.target.value)}
            className="input"
            data-agent-ref="patient-form:temperature"
            data-agent-role="textbox"
            data-agent-label="Nhiệt độ (°C)"
          />
        </Field>
      </div>

      {error && (
        <div
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          data-agent-ref="patient-form:error"
          data-agent-role="alert"
          data-agent-label="Lỗi form bệnh nhân"
        >
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          disabled={submitting}
          data-agent-ref="patient-form:cancel"
          data-agent-role="button"
          data-agent-label="Huỷ"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={submitting}
          data-agent-ref="patient-form:submit"
          data-agent-role="button"
          data-agent-label="Tạo bệnh nhân"
          data-agent-busy={submitting ? "true" : undefined}
          className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
        >
          {submitting ? "Đang lưu…" : "Tạo"}
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

function Field({
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
