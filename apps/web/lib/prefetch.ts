"use client";

// Nạp trước (warm cache) dữ liệu hay dùng NGAY khi đăng nhập / quay lại app đã
// đăng nhập sẵn — không chờ người dùng bấm vào chức năng mới fetch. Ghi thẳng vào
// resourceCache (cùng key với hook tiêu thụ) nên khi mở tab tương ứng thấy data ngay.
// Best-effort: chạy song song, nuốt lỗi từng mục (warm cache hỏng không chặn UI).

import { http } from "./apiClient";
import { setCached } from "./resourceCache";

type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  patientId?: string;
};

const RECENT_CONVERSATIONS = 3;

// Bác sĩ: danh sách bệnh nhân + lịch hẹn + nội dung 3 hội thoại gần nhất.
export async function prefetchDoctorData(): Promise<void> {
  await Promise.allSettled([
    prefetch("/api/patients"),
    prefetch("/api/appointments"),
    prefetchRecentConversations(),
  ]);
}

// Fetch 1 path rồi ghi cache đúng key (= path) mà useResource/hook khác đọc.
async function prefetch(path: string): Promise<void> {
  const data = await http.get(path);
  setCached(path, data);
}

async function prefetchRecentConversations(): Promise<void> {
  // useConversations cache MẢNG conversations (không phải wrapper).
  const json = await http.get<{ conversations: ConversationListItem[] }>(
    "/api/conversations"
  );
  const list = json.conversations ?? [];
  setCached("/api/conversations", list);

  const recent = [...list]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, RECENT_CONVERSATIONS);

  await Promise.allSettled(
    // Key /api/conversations/:id khớp aiPath() trong useChat → mở thread thấy ngay.
    recent.map((c) => prefetch(`/api/conversations/${c.id}`))
  );
}
