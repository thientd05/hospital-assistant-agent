"use client";

import { useState } from "react";
import type { PatientPublic } from "@pr_hospitalagent/types";
import { patientsApi } from "@/hooks/usePatients";

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
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
    >
      <h3 className="text-base font-semibold text-gray-900">
        {editId ? `Sửa hồ sơ ${editId}` : "Tạo bệnh nhân mới"}
      </h3>
      <Field label="Họ tên">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
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
            className="input"
            required
          />
        </Field>
        <Field label="Giới tính">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "Nam" | "Nữ")}
            className="input"
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
          className="input"
          required
        />
      </Field>
      <Field label="Chẩn đoán (phân tách bằng dấu phẩy)">
        <input
          value={diagnoses}
          onChange={(e) => setDiagnoses(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Thuốc (phân tách bằng dấu phẩy)">
        <input
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          className="input"
        />
      </Field>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          disabled={submitting}
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 text-sm rounded-md bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {submitting ? "Đang lưu…" : editId ? "Lưu" : "Tạo"}
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
