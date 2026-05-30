"use client";

import { useState } from "react";
import type { PatientPublic } from "@pr_hospitalagent/types";
import { patientsApi } from "@/hooks/usePatients";
import { Field } from "./Field";
import { FormHeader, FormError, FormActions } from "./ui";

type Props = {
  initial?: Partial<PatientPublic>;
  editId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function PatientForm({ initial, editId, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [age, setAge] = useState(String(initial?.age ?? ""));
  const [gender, setGender] = useState<"Nam" | "Nữ">(
    initial?.gender ?? "Nam"
  );
  const [ward, setWard] = useState(initial?.ward ?? "");
  const [diagnoses, setDiagnoses] = useState(
    (initial?.diagnoses ?? []).join(", ")
  );
  const [medications, setMedications] = useState(
    (initial?.medications ?? []).join(", ")
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ageNum = Number(age);
    if (!name.trim() || !ward.trim() || !Number.isInteger(ageNum) || ageNum < 0) {
      setError("Vui lòng nhập đủ Họ tên, Tuổi (số nguyên ≥ 0), Khoa/phòng.");
      return;
    }
    const body = {
      name: name.trim(),
      age: ageNum,
      gender,
      ward: ward.trim(),
      diagnoses: diagnoses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      medications: medications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setSubmitting(true);
    try {
      if (editId) {
        await patientsApi.update(editId, body);
      } else {
        await patientsApi.create(body);
      }
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <FormHeader
        title={editId ? `Sửa hồ sơ ${editId}` : "Tạo bệnh nhân mới"}
      />
      <div className="p-4 space-y-3.5">
      <Field label="Họ tên">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="ws-input"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tuổi">
          <input
            type="number"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="ws-input"
            required
          />
        </Field>
        <Field label="Giới tính">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "Nam" | "Nữ")}
            className="ws-input"
          >
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </Field>
      </div>
      <Field label="Khoa / phòng">
        <input
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="ws-input"
          required
        />
      </Field>
      <Field label="Chẩn đoán (phân tách bằng dấu phẩy)">
        <input
          value={diagnoses}
          onChange={(e) => setDiagnoses(e.target.value)}
          className="ws-input"
        />
      </Field>
      <Field label="Thuốc (phân tách bằng dấu phẩy)">
        <input
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          className="ws-input"
        />
      </Field>
      {error && <FormError>{error}</FormError>}
      <FormActions
        onCancel={onClose}
        submitting={submitting}
        submitLabel={editId ? "Lưu" : "Tạo"}
      />
      </div>
    </form>
  );
}
