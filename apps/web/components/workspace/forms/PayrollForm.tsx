"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmployeeRole,
  Payroll,
  PayrollStatus,
} from "@pr_hospitalagent/types";
import { payrollApi } from "@/hooks/usePayroll";
import { useDoctors } from "@/hooks/useDoctors";
import { useExperts } from "@/hooks/useExperts";
import { useAuth } from "@/app/providers/AuthProvider";
import { Field as Lbl } from "./Field";
import { FormModal, FormHeader, FormError, FormActions } from "./ui";

const STATUSES: PayrollStatus[] = ["Chưa thanh toán", "Đã thanh toán"];

type EmployeeOption = {
  id: string;
  role: EmployeeRole;
  name: string;
};

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Props = {
  initial?: Partial<Payroll>;
  editId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function PayrollForm({ initial, editId, onClose, onSaved }: Props) {
  const { manager } = useAuth();
  const doctorsRes = useDoctors(0, true);
  const expertsRes = useExperts(0, true);

  const employees = useMemo<EmployeeOption[]>(() => {
    const out: EmployeeOption[] = [];
    for (const d of doctorsRes.data?.doctors ?? []) {
      out.push({
        id: d.id,
        role: "doctor",
        name: `${d.title} ${d.fullName}`.trim(),
      });
    }
    for (const e of expertsRes.data?.experts ?? []) {
      out.push({
        id: e.id,
        role: "expert",
        name: `${e.title} ${e.fullName}`.trim(),
      });
    }
    if (manager) {
      out.push({
        id: manager.id,
        role: "manager",
        name: `${manager.title} ${manager.fullName}`.trim(),
      });
    }
    return out;
  }, [doctorsRes.data, expertsRes.data, manager]);

  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? "");
  const [period, setPeriod] = useState(initial?.period ?? thisMonth());
  const [baseSalary, setBaseSalary] = useState(
    initial?.baseSalary !== undefined ? String(initial.baseSalary) : ""
  );
  const [bonus, setBonus] = useState(
    initial?.bonus !== undefined ? String(initial.bonus) : "0"
  );
  const [deduction, setDeduction] = useState(
    initial?.deduction !== undefined ? String(initial.deduction) : "0"
  );
  const [status, setStatus] = useState<PayrollStatus>(
    (initial?.status as PayrollStatus) ?? "Chưa thanh toán"
  );
  const [paidDate, setPaidDate] = useState(toDateInput(initial?.paidDate));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId && employees.length > 0 && !editId) {
      setEmployeeId(employees[0]!.id);
    }
  }, [employees, employeeId, editId]);

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const fallbackEmployee: EmployeeOption | undefined = initial?.employeeId
    ? {
        id: initial.employeeId,
        role: (initial.employeeRole as EmployeeRole) ?? "doctor",
        name: initial.employeeName ?? initial.employeeId,
      }
    : undefined;
  const employee = selectedEmployee ?? fallbackEmployee;

  const net =
    (Number(baseSalary) || 0) +
    (Number(bonus) || 0) -
    (Number(deduction) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!employee) {
      setError("Hãy chọn nhân viên.");
      return;
    }
    if (!period.match(/^\d{4}-\d{2}$/)) {
      setError("Kỳ lương phải có dạng YYYY-MM.");
      return;
    }
    const bs = Number(baseSalary);
    const bn = Number(bonus);
    const dd = Number(deduction);
    if (!Number.isFinite(bs) || bs < 0) {
      setError("Lương cơ bản không hợp lệ.");
      return;
    }
    if (!Number.isFinite(bn) || bn < 0) {
      setError("Thưởng không hợp lệ.");
      return;
    }
    if (!Number.isFinite(dd) || dd < 0) {
      setError("Khấu trừ không hợp lệ.");
      return;
    }
    const body = {
      employeeId: employee.id,
      employeeRole: employee.role,
      employeeName: employee.name,
      period,
      baseSalary: bs,
      bonus: bn,
      deduction: dd,
      status,
      paidDate: status === "Đã thanh toán" ? paidDate || null : null,
      notes: notes.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editId) {
        await payrollApi.update(editId, body);
      } else {
        await payrollApi.create(body);
      }
      onSaved();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal maxWidth={500}>
      <form onSubmit={submit}>
        <FormHeader
          title={editId ? `Sửa bản lương ${editId}` : "Thêm bản lương"}
        />
        <div className="p-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Nhân viên">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="ws-input"
              required
              disabled={Boolean(editId)}
            >
              {!employeeId && <option value="">— Chọn —</option>}
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.name}
                </option>
              ))}
              {fallbackEmployee &&
                !employees.some((e) => e.id === fallbackEmployee.id) && (
                  <option value={fallbackEmployee.id}>
                    {fallbackEmployee.id} · {fallbackEmployee.name}
                  </option>
                )}
            </select>
          </Lbl>
          <Lbl label="Kỳ lương (YYYY-MM)">
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Lbl label="Lương cơ bản">
            <input
              type="number"
              min={0}
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="ws-input"
              required
            />
          </Lbl>
          <Lbl label="Thưởng">
            <input
              type="number"
              min={0}
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              className="ws-input"
            />
          </Lbl>
          <Lbl label="Khấu trừ">
            <input
              type="number"
              min={0}
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              className="ws-input"
            />
          </Lbl>
        </div>
        <div className="rounded-md bg-[#C8E7E9]/40 border border-[#C8E7E9] px-3 py-2 text-sm flex items-center justify-between">
          <span className="text-gray-700">Thực nhận:</span>
          <span className="font-semibold text-[#087E8B] tabular-nums">
            {net.toLocaleString("vi-VN")} ₫
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Lbl label="Trạng thái">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollStatus)}
              className="ws-input"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl label="Ngày thanh toán">
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="ws-input"
              disabled={status !== "Đã thanh toán"}
            />
          </Lbl>
        </div>
        <Lbl label="Ghi chú">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="ws-input"
            rows={2}
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
