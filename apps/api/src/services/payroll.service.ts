import type { Payroll } from "@pr_hospitalagent/types";
import { payrollRepo } from "../repositories/payroll.repo.ts";
import { NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import type { PayrollCreate, PayrollUpdate } from "../schemas/payroll.ts";

const UPDATE_KEYS = [
  "employeeId",
  "employeeRole",
  "employeeName",
  "period",
  "status",
  "notes",
] as const;

export const payrollService = {
  list: () => payrollRepo.list(),

  async get(id: string) {
    const doc = await payrollRepo.findById(id);
    if (!doc) throw new NotFoundError(`Không tìm thấy bản lương ${id}`);
    return doc;
  },

  async create(data: PayrollCreate): Promise<Payroll> {
    const id = await payrollRepo.nextId();
    const net = data.baseSalary + data.bonus - data.deduction;
    const doc: Payroll = {
      id,
      employeeId: data.employeeId,
      employeeRole: data.employeeRole,
      employeeName: data.employeeName,
      period: data.period,
      baseSalary: data.baseSalary,
      bonus: data.bonus,
      deduction: data.deduction,
      net,
      paidDate: data.paidDate ? new Date(data.paidDate) : null,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(),
    };
    await payrollRepo.insert(doc);
    return doc;
  },

  async update(id: string, data: PayrollUpdate) {
    const existing = await payrollRepo.findById(id);
    if (!existing) throw new NotFoundError(`Không tìm thấy bản lương ${id}`);

    const $set = buildSet(data, UPDATE_KEYS);
    if (data.paidDate !== undefined) {
      $set.paidDate = data.paidDate ? new Date(data.paidDate) : null;
    }

    const baseSalary = data.baseSalary ?? existing.baseSalary;
    const bonus = data.bonus ?? existing.bonus;
    const deduction = data.deduction ?? existing.deduction;
    if (
      data.baseSalary !== undefined ||
      data.bonus !== undefined ||
      data.deduction !== undefined
    ) {
      $set.baseSalary = baseSalary;
      $set.bonus = bonus;
      $set.deduction = deduction;
      $set.net = baseSalary + bonus - deduction;
    }
    assertHasUpdates($set);
    await payrollRepo.patch(id, $set);
    return payrollRepo.findById(id);
  },

  async delete(id: string) {
    const ok = await payrollRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy bản lương ${id}`);
    return { ok: true, deleted: id };
  },
};
