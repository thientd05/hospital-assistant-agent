import type {
  FamilyInvite,
  FamilyInviteView,
  FamilyMemberDetail,
  FamilyView,
} from "@pr_hospitalagent/types";
import { familyRepo } from "../repositories/family.repo.ts";
import { familyInviteRepo } from "../repositories/familyInvite.repo.ts";
import { patientRepo } from "../repositories/patient.repo.ts";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../lib/errors.ts";

function familyName(inviterName: string | undefined): string {
  const base = (inviterName ?? "").trim();
  return base ? `Gia đình của ${base}` : "Gia đình";
}

export const familyService = {
  // Gia đình hiện tại của BN (kèm danh sách thành viên). null nếu chưa có.
  async getMyFamily(patientId: string): Promise<FamilyView> {
    const fam = await familyRepo.findByMember(patientId);
    if (!fam) return null;
    const members = await patientRepo.listByIds(fam.memberIds);
    return {
      family: {
        id: fam.id,
        name: fam.name,
        createdAt: fam.createdAt,
        updatedAt: fam.updatedAt,
      },
      members: members.map((m) => ({ id: m.id, name: m.name })),
    };
  },

  // Mời người nhà theo SĐT.
  async invite(fromPatientId: string, phone: string) {
    const target = await patientRepo.findRaw({ phone: phone.trim() });
    if (!target) {
      throw new NotFoundError(
        "Không tìm thấy bệnh nhân với số điện thoại này."
      );
    }
    if (target.id === fromPatientId) {
      throw new BadRequestError("Không thể tự mời chính mình.");
    }
    // Một BN thuộc tối đa một gia đình → người được mời không được đang ở nhóm khác.
    const targetFam = await familyRepo.findByMember(target.id);
    if (targetFam) {
      throw new ConflictError("Người này đã thuộc một gia đình khác.");
    }
    const dup = await familyInviteRepo.findPendingPair(fromPatientId, target.id);
    if (dup) {
      throw new ConflictError("Đã có lời mời đang chờ gửi tới người này.");
    }
    const now = new Date();
    const invite: FamilyInvite = {
      id: await familyInviteRepo.nextId(),
      fromPatientId,
      toPatientId: target.id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    await familyInviteRepo.insert(invite);
    return { ok: true, invite };
  },

  // Các lời mời đang chờ mà BN nhận được (kèm tên người gửi).
  async listInvites(patientId: string): Promise<FamilyInviteView[]> {
    const rows = await familyInviteRepo.listPendingFor(patientId);
    if (rows.length === 0) return [];
    const senders = await patientRepo.listByIds(
      Array.from(new Set(rows.map((r) => r.fromPatientId)))
    );
    const nameById = new Map(senders.map((s) => [s.id, s.name]));
    return rows.map((r) => ({
      id: r.id,
      fromPatientId: r.fromPatientId,
      fromName: nameById.get(r.fromPatientId) || r.fromPatientId,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },

  // Chấp nhận lời mời: chỉ người được mời, chưa thuộc nhóm nào.
  async accept(patientId: string, inviteId: string): Promise<FamilyView> {
    const invite = await familyInviteRepo.findById(inviteId);
    if (!invite) throw new NotFoundError("Không tìm thấy lời mời.");
    if (invite.toPatientId !== patientId) {
      throw new ForbiddenError("Lời mời này không dành cho bạn.");
    }
    if (invite.status !== "pending") {
      throw new ConflictError("Lời mời đã được xử lý.");
    }
    if (await familyRepo.findByMember(patientId)) {
      throw new ConflictError("Bạn đã thuộc một gia đình.");
    }
    // Chốt trạng thái lời mời TRƯỚC (nguyên tử) — chống chấp nhận 2 lần.
    const won = await familyInviteRepo.settle(inviteId, "accepted");
    if (!won) throw new ConflictError("Lời mời đã được xử lý.");

    const inviterFam = await familyRepo.findByMember(invite.fromPatientId);
    if (inviterFam) {
      const added = await familyRepo.addMember(inviterFam.id, patientId);
      if (!added) throw new ConflictError("Không thể thêm vào gia đình.");
    } else {
      // Tạo nhóm mới, đặt tên theo NGƯỜI MỜI (người tạo nhóm).
      const inviter = await patientRepo.findById(invite.fromPatientId);
      const now = new Date();
      await familyRepo.insert({
        id: await familyRepo.nextId(),
        name: familyName(inviter?.name),
        memberIds: [invite.fromPatientId, patientId],
        createdAt: now,
        updatedAt: now,
      });
    }
    return this.getMyFamily(patientId);
  },

  // Từ chối lời mời: chỉ người được mời.
  async decline(patientId: string, inviteId: string) {
    const invite = await familyInviteRepo.findById(inviteId);
    if (!invite) throw new NotFoundError("Không tìm thấy lời mời.");
    if (invite.toPatientId !== patientId) {
      throw new ForbiddenError("Lời mời này không dành cho bạn.");
    }
    const ok = await familyInviteRepo.settle(inviteId, "declined");
    if (!ok) throw new ConflictError("Lời mời đã được xử lý.");
    return { ok: true };
  },

  // Đổi tên nhóm: phải là thành viên.
  async rename(patientId: string, name: string): Promise<FamilyView> {
    const fam = await familyRepo.findByMember(patientId);
    if (!fam) throw new NotFoundError("Bạn chưa thuộc gia đình nào.");
    await familyRepo.rename(fam.id, name.trim());
    return this.getMyFamily(patientId);
  },

  // Tự rời nhóm. Nhóm còn ≤1 người → giải tán.
  async leave(patientId: string) {
    const fam = await familyRepo.findByMember(patientId);
    if (!fam) throw new NotFoundError("Bạn chưa thuộc gia đình nào.");
    await this.dissolveOrRemove(fam.id, fam.memberIds, patientId);
    return { ok: true };
  },

  // Xoá một thành viên khác khỏi nhóm: người yêu cầu phải cùng nhóm với người bị xoá.
  async removeMember(requesterId: string, memberId: string) {
    const fam = await familyRepo.findByMember(requesterId);
    if (!fam) throw new NotFoundError("Bạn chưa thuộc gia đình nào.");
    if (!fam.memberIds.includes(memberId)) {
      throw new NotFoundError("Thành viên không thuộc gia đình của bạn.");
    }
    await this.dissolveOrRemove(fam.id, fam.memberIds, memberId);
    return { ok: true };
  },

  // Bỏ một thành viên; nếu sau khi bỏ nhóm còn ≤1 người thì xoá luôn nhóm.
  async dissolveOrRemove(
    familyId: string,
    memberIds: string[],
    removeId: string
  ) {
    const remaining = memberIds.filter((id) => id !== removeId);
    if (remaining.length <= 1) {
      await familyRepo.delete(familyId);
    } else {
      await familyRepo.removeMember(familyId, removeId);
    }
  },

  // Hồ sơ + xét nghiệm của một thành viên — CHỈ khi cùng nhóm. KHÔNG lịch hẹn.
  async getMember(
    requesterId: string,
    memberId: string
  ): Promise<FamilyMemberDetail> {
    const fam = await familyRepo.findByMember(requesterId);
    if (!fam || !fam.memberIds.includes(memberId)) {
      throw new ForbiddenError("Bạn không có quyền xem thông tin này.");
    }
    const patient = await patientRepo.findById(memberId);
    if (!patient) throw new NotFoundError("Không tìm thấy thành viên.");
    const labs = await patientRepo.getLabResults(memberId);
    return {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        ward: patient.ward,
        address: patient.address,
        phone: patient.phone,
        diagnoses: patient.diagnoses,
        vitals: patient.vitals,
      },
      labResults: labs?.labResults ?? [],
    };
  },
};
