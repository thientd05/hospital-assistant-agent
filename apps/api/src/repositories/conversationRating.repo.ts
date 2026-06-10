import type { ConversationRating } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "conversationratings";
const PROJECTION = { _id: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<ConversationRating>(COLLECTION);
}

export const conversationRatingRepo = {
  nextId: () => nextId(COLLECTION, "CR", 3),

  // Upsert theo (conversationId, turnIndex) — mỗi lượt đúng một đánh giá.
  async setRating(
    conversationId: string,
    ownerId: string,
    turnIndex: number,
    stars: number
  ): Promise<ConversationRating> {
    const c = await coll();
    const now = new Date();
    const existing = await c.findOne(
      { conversationId, turnIndex },
      { projection: PROJECTION }
    );
    if (existing) {
      await c.updateOne(
        { conversationId, turnIndex },
        { $set: { stars, ownerId, updatedAt: now } }
      );
      return { ...existing, stars, ownerId, updatedAt: now };
    }
    const id = await this.nextId();
    const doc: ConversationRating = {
      id,
      conversationId,
      ownerId,
      turnIndex,
      stars,
      createdAt: now,
      updatedAt: now,
    };
    await c.insertOne(doc);
    return doc;
  },

  async listByConversation(conversationId: string): Promise<ConversationRating[]> {
    const c = await coll();
    return c
      .find({ conversationId }, { projection: PROJECTION })
      .sort({ turnIndex: 1 })
      .toArray();
  },
};
