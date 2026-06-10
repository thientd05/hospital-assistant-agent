import type { RatingView } from "@pr_hospitalagent/types";
import { conversationRatingRepo } from "../repositories/conversationRating.repo.ts";
import { conversationRepo } from "../repositories/conversation.repo.ts";
import { NotFoundError } from "../lib/errors.ts";

function toViews(
  rows: { turnIndex: number; stars: number }[]
): RatingView[] {
  return rows.map((r) => ({ turnIndex: r.turnIndex, stars: r.stars }));
}

export const conversationRatingService = {
  // Bệnh nhân chấm sao cho một lượt trả lời trong hội thoại của CHÍNH MÌNH.
  async setRating(
    conversationId: string,
    ownerId: string,
    turnIndex: number,
    stars: number
  ) {
    // Owner check: conversation thuộc bệnh nhân này (doctorId = ownerId, lý do lịch sử).
    const doc = await conversationRepo.findByOwner(conversationId, ownerId);
    if (!doc) throw new NotFoundError("Conversation not found");
    const saved = await conversationRatingRepo.setRating(
      conversationId,
      ownerId,
      turnIndex,
      stars
    );
    return { turnIndex: saved.turnIndex, stars: saved.stars };
  },

  // Danh sách đánh giá của một hội thoại (cho chính chủ xem lại).
  async listForOwner(conversationId: string, ownerId: string): Promise<{ ratings: RatingView[] }> {
    const doc = await conversationRepo.findByOwner(conversationId, ownerId);
    if (!doc) throw new NotFoundError("Conversation not found");
    const rows = await conversationRatingRepo.listByConversation(conversationId);
    return { ratings: toViews(rows) };
  },

  // Danh sách đánh giá của một hội thoại (cho chuyên gia audit — chỉ đọc).
  async listForAudit(conversationId: string): Promise<RatingView[]> {
    const rows = await conversationRatingRepo.listByConversation(conversationId);
    return toViews(rows);
  },
};
