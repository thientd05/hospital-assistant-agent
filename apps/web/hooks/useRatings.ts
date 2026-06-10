"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RatingView } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";

type RatingsContextValue = {
  /** Số sao đã chấm cho một lượt (0 = chưa chấm). */
  getRating: (turnIndex: number) => number;
  /** Chấm sao cho một lượt (optimistic + lưu server). */
  setRating: (turnIndex: number, stars: number) => void;
};

const RatingsContext = createContext<RatingsContextValue | null>(null);

// Quản lý đánh giá sao cho hội thoại AI đang mở (bệnh nhân chấm câu trả lời).
// Tải map đánh giá khi đổi hội thoại; chấm = cập nhật lạc quan rồi PUT về server.
export function useRatingsState(conversationId: string | null) {
  const [map, setMap] = useState<Record<number, number>>({});
  // Tránh ghi đè kết quả của hội thoại cũ khi đổi nhanh.
  const convRef = useRef(conversationId);
  convRef.current = conversationId;

  useEffect(() => {
    if (!conversationId) {
      setMap({});
      return;
    }
    let cancelled = false;
    setMap({});
    http
      .get<{ ratings: RatingView[] }>(
        `/api/conversations/${conversationId}/ratings`
      )
      .then((data) => {
        if (cancelled || convRef.current !== conversationId) return;
        const next: Record<number, number> = {};
        for (const r of data.ratings) next[r.turnIndex] = r.stars;
        setMap(next);
      })
      .catch(() => {
        /* hội thoại mới chưa có đánh giá / lỗi mạng → để trống */
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const getRating = useCallback((turnIndex: number) => map[turnIndex] ?? 0, [map]);

  const setRating = useCallback(
    (turnIndex: number, stars: number) => {
      if (!conversationId) return;
      const prev = map[turnIndex] ?? 0;
      setMap((m) => ({ ...m, [turnIndex]: stars }));
      http
        .put(`/api/conversations/${conversationId}/ratings/${turnIndex}`, {
          stars,
        })
        .catch(() => {
          // Lỗi lưu → quay về giá trị cũ.
          setMap((m) => ({ ...m, [turnIndex]: prev }));
        });
    },
    [conversationId, map]
  );

  return { getRating, setRating };
}

export const RatingsProvider = RatingsContext.Provider;

export function useRatings(): RatingsContextValue | null {
  return useContext(RatingsContext);
}
