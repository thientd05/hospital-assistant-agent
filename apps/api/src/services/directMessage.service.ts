import type {
  DirectMessage,
  DirectThreadSummary,
} from "@pr_hospitalagent/types";
import { directMessageRepo } from "../repositories/directMessage.repo.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { patientRepo } from "../repositories/patient.repo.ts";
import { ForbiddenError } from "../lib/errors.ts";

function lastOf(messages: DirectMessage[]): string | null {
  const last = messages[messages.length - 1];
  return last ? last.content : null;
}

function lastSenderOf(messages: DirectMessage[]): DirectMessage["sender"] | null {
  const last = messages[messages.length - 1];
  return last ? last.sender : null;
}

// Bác sĩ chỉ được nhắn BN trong danh sách quản lý của mình.
async function assertManages(doctorId: string, patientId: string) {
  const ids = await doctorRepo.getManagedIds(doctorId);
  if (!ids.includes(patientId)) {
    throw new ForbiddenError("Bệnh nhân không thuộc danh sách bạn quản lý.");
  }
}

export const directMessageService = {
  // === Góc nhìn bác sĩ ===
  // Liệt kê MỌI bệnh nhân mình quản lý (kể cả thread rỗng) → bác sĩ chủ động hỏi.
  async listForDoctor(doctorId: string): Promise<{
    threads: DirectThreadSummary[];
  }> {
    const ids = await doctorRepo.getManagedIds(doctorId);
    const [patients, threads] = await Promise.all([
      patientRepo.listByIds(ids),
      directMessageRepo.listByDoctor(doctorId),
    ]);
    const nameById = new Map(patients.map((p) => [p.id, p.name]));
    const threadByPatient = new Map(threads.map((t) => [t.patientId, t]));
    const summaries: DirectThreadSummary[] = ids.map((pid) => {
      const t = threadByPatient.get(pid);
      return {
        counterpartId: pid,
        counterpartName: nameById.get(pid) ?? pid,
        lastMessage: t ? lastOf(t.messages) : null,
        lastSender: t ? lastSenderOf(t.messages) : null,
        updatedAt: t ? t.updatedAt : null,
      };
    });
    // Có tin gần nhất lên trước; chưa có tin xếp cuối theo tên.
    summaries.sort((a, b) => {
      if (a.updatedAt && b.updatedAt)
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (a.updatedAt) return -1;
      if (b.updatedAt) return 1;
      return a.counterpartName.localeCompare(b.counterpartName, "vi");
    });
    return { threads: summaries };
  },

  async getForDoctor(doctorId: string, patientId: string) {
    await assertManages(doctorId, patientId);
    const thread = await directMessageRepo.findPair(doctorId, patientId);
    return { messages: thread?.messages ?? [] };
  },

  async sendFromDoctor(doctorId: string, patientId: string, content: string) {
    await assertManages(doctorId, patientId);
    const message: DirectMessage = {
      sender: "doctor",
      content: content.trim(),
      createdAt: new Date(),
    };
    await directMessageRepo.appendMessage(doctorId, patientId, message);
    return { ok: true, message };
  },

  // === Góc nhìn bệnh nhân ===
  async listForPatient(patientId: string): Promise<{
    threads: DirectThreadSummary[];
  }> {
    const [doctors, threads] = await Promise.all([
      doctorRepo.listManaging(patientId),
      directMessageRepo.listByPatient(patientId),
    ]);
    const nameById = new Map(doctors.map((d) => [d.id, d.fullName]));
    const threadByDoctor = new Map(threads.map((t) => [t.doctorId, t]));
    const summaries: DirectThreadSummary[] = doctors.map((d) => {
      const t = threadByDoctor.get(d.id);
      return {
        counterpartId: d.id,
        counterpartName: nameById.get(d.id) ?? d.id,
        lastMessage: t ? lastOf(t.messages) : null,
        lastSender: t ? lastSenderOf(t.messages) : null,
        updatedAt: t ? t.updatedAt : null,
      };
    });
    summaries.sort((a, b) => {
      if (a.updatedAt && b.updatedAt)
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (a.updatedAt) return -1;
      if (b.updatedAt) return 1;
      return a.counterpartName.localeCompare(b.counterpartName, "vi");
    });
    return { threads: summaries };
  },

  async getForPatient(patientId: string, doctorId: string) {
    await assertManages(doctorId, patientId);
    const thread = await directMessageRepo.findPair(doctorId, patientId);
    return { messages: thread?.messages ?? [] };
  },

  async sendFromPatient(patientId: string, doctorId: string, content: string) {
    await assertManages(doctorId, patientId);
    const message: DirectMessage = {
      sender: "patient",
      content: content.trim(),
      createdAt: new Date(),
    };
    await directMessageRepo.appendMessage(doctorId, patientId, message);
    return { ok: true, message };
  },
};
