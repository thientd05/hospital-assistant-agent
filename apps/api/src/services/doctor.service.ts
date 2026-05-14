import type { Doctor, DoctorPublic } from "@pr_hospitalagent/types";
import { hashPassword } from "@pr_hospitalagent/api-shared";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { ConflictError, NotFoundError } from "../lib/errors.ts";
import { buildSet, assertHasUpdates } from "../lib/patch.ts";
import { stripPassword } from "../lib/public.ts";
import type { DoctorCreate, DoctorUpdate } from "../schemas/doctor.ts";

const UPDATE_KEYS = [
  "fullName",
  "title",
  "department",
  "specialty",
  "phone",
  "email",
  "address",
] as const;

export const doctorService = {
  list: () => doctorRepo.listSummary(),

  async get(id: string): Promise<DoctorPublic> {
    const doctor = await doctorRepo.findById(id);
    if (!doctor) throw new NotFoundError(`Không tìm thấy bác sĩ ${id}`);
    return doctor;
  },

  async create(data: DoctorCreate): Promise<Omit<Doctor, "passwordHash">> {
    const id = await doctorRepo.nextId();
    const username = data.username ?? id.toLowerCase();
    const password = data.password ?? `matkhau${username}`;
    const existing = await doctorRepo.findByUsername(username);
    if (existing) {
      throw new ConflictError(`Username "${username}" đã tồn tại.`);
    }
    const doctor: Doctor = {
      id,
      username,
      passwordHash: hashPassword(password),
      fullName: data.fullName,
      title: data.title,
      department: data.department,
      specialty: data.specialty,
      phone: data.phone,
      email: data.email,
      address: data.address,
      workspaceDir: `workspaces/${id}`,
      createdAt: new Date(),
    };
    await doctorRepo.insert(doctor);
    return stripPassword(doctor);
  },

  async update(id: string, data: DoctorUpdate): Promise<DoctorPublic> {
    const $set = buildSet(data, UPDATE_KEYS);
    if (data.password) $set.passwordHash = hashPassword(data.password);
    assertHasUpdates($set);
    const ok = await doctorRepo.patch(id, $set);
    if (!ok) throw new NotFoundError(`Không tìm thấy bác sĩ ${id}`);
    return (await doctorRepo.findById(id))!;
  },

  async delete(id: string) {
    const ok = await doctorRepo.delete(id);
    if (!ok) throw new NotFoundError(`Không tìm thấy bác sĩ ${id}`);
    return { ok: true, deleted: id };
  },
};
