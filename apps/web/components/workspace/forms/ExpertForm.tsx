"use client";

import { useState } from "react";
import type { ExpertPublic } from "@pr_hospitalagent/types";
import { expertsApi } from "@/hooks/useExperts";
import { Field as Lbl } from "./Field";
import { FormModal, FormHeader, FormError, FormActions } from "./ui";

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
    <FormModal maxWidth={440}>
      <form onSubmit={submit}>
        <FormHeader
          title={editId ? `Sửa chuyên gia ${editId}` : "Tạo chuyên gia mới"}
        />
        <div className="p-4 space-y-3.5">
        <Lbl label="Họ tên">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="ws-input"
            required
          />
        </Lbl>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Chức danh">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Lĩnh vực">
            <input
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Điện thoại">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
        </div>
        <Lbl label="Địa chỉ">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="ws-input"
            required
          />
        </Lbl>
        {error && <FormError>{error}</FormError>}
        <FormActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel={editId ? "Lưu" : "Tạo"}
        />
        </div>
      </form>
    </FormModal>
  );
}
