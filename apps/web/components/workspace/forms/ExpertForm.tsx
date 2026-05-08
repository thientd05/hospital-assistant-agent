"use client";

import { useState } from "react";
import type { ExpertPublic } from "@pr_hospitalagent/types";
import { expertsApi } from "@/hooks/useExperts";

type Props = {
  initial?: Partial<ExpertPublic>;
  editId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ExpertForm({ initial, editId, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [title, setTitle] = useState(initial?.title ?? "CG");
  const [expertise, setExpertise] = useState(initial?.expertise ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !fullName.trim() ||
      !title.trim() ||
      !expertise.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !address.trim()
    ) {
      setError("Cần nhập đủ tất cả các trường.");
      return;
    }
    const body = {
      fullName: fullName.trim(),
      title: title.trim(),
      expertise: expertise.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    };
    setSubmitting(true);
    try {
      if (editId) {
        await expertsApi.update(editId, body);
      } else {
        await expertsApi.create(body);
      }
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={submit}
        className="w-[420px] max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 p-5 space-y-3"
      >
        <h3 className="text-base font-semibold text-gray-900">
          {editId ? `Sửa chuyên gia ${editId}` : "Tạo chuyên gia mới"}
        </h3>
        <Lbl label="Họ tên">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            required
          />
        </Lbl>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Chức danh">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
            />
          </Lbl>
          <Lbl label="Lĩnh vực">
            <input
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Điện thoại">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              required
            />
          </Lbl>
          <Lbl label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </Lbl>
        </div>
        <Lbl label="Địa chỉ">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
            required
          />
        </Lbl>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
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
    </div>
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
