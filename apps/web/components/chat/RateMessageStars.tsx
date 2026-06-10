"use client";

import { StarRating } from "./StarRating";
import { useRatings } from "@/hooks/useRatings";

// Footer chấm sao cho một câu trả lời chatbot (bệnh nhân). Đọc/ghi qua
// RatingsContext nên tự cập nhật khi đánh giá đổi, KHÔNG phụ thuộc memo của
// MessageBubble. Ngoài context (không phải mode AI bệnh nhân) → không hiện gì.
export function RateMessageStars({ turnIndex }: { turnIndex: number }) {
  const ratings = useRatings();
  if (!ratings) return null;
  return (
    <StarRating
      value={ratings.getRating(turnIndex)}
      onRate={(stars) => ratings.setRating(turnIndex, stars)}
    />
  );
}
