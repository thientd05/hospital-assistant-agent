"use client";

import type { PatientFormValues } from "@/hooks/useWorkspace";
import { Field } from "./Field";
import { FormHeader, FormError, FormActions } from "./ui";

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
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <FormHeader title="Tạo bệnh nhân mới" />
      <div className="p-4 space-y-3.5">
      <Field label="Họ tên">
        <input
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          className="ws-input"
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
            className="ws-input"
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
            className="ws-input"
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
          className="ws-input"
          data-agent-ref="patient-form:ward"
          data-agent-role="textbox"
          data-agent-label="Khoa / phòng"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Địa chỉ">
          <input
            value={values.address}
            onChange={(e) => onChange("address", e.target.value)}
            className="ws-input"
            data-agent-ref="patient-form:address"
            data-agent-role="textbox"
            data-agent-label="Địa chỉ"
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            value={values.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="ws-input"
            data-agent-ref="patient-form:phone"
            data-agent-role="textbox"
            data-agent-label="Số điện thoại"
          />
        </Field>
      </div>
      <Field label="Thuốc (phân tách bằng dấu phẩy)">
        <input
          value={values.medications}
          onChange={(e) => onChange("medications", e.target.value)}
          className="ws-input"
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
            className="ws-input"
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
            className="ws-input"
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
            className="ws-input"
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
            className="ws-input"
            data-agent-ref="patient-form:temperature"
            data-agent-role="textbox"
            data-agent-label="Nhiệt độ (°C)"
          />
        </Field>
      </div>

      {error && (
        <FormError
          agentRef="patient-form:error"
          agentLabel="Lỗi form bệnh nhân"
        >
          {error}
        </FormError>
      )}
      <FormActions
        onCancel={onClose}
        submitting={submitting}
        submitLabel="Tạo"
        cancelProps={{
          "data-agent-ref": "patient-form:cancel",
          "data-agent-role": "button",
          "data-agent-label": "Huỷ",
        }}
        submitProps={{
          "data-agent-ref": "patient-form:submit",
          "data-agent-role": "button",
          "data-agent-label": "Tạo bệnh nhân",
          "data-agent-busy": submitting ? "true" : undefined,
        }}
      />
      </div>
    </form>
  );
}
