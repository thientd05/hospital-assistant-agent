"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Message } from "@pr_hospitalagent/types";
import { MessageBubble } from "./MessageBubble";
import { AssistantAvatar } from "@/components/AssistantAvatar";

type Props = {
  messages: Message[];
  /** Bố cục tin nhắn trực tiếp 1-1: tin của mình bên phải, đối phương bên trái (đều có bong bóng). */
  bubbles?: boolean;
  /** Nội dung hiện ngay dưới tin cuối, trong vùng cuộn (vd: list nút gợi ý sau lời chào). */
  footer?: ReactNode;
  /**
   * Footer riêng dưới MỖI câu trả lời assistant (vd icon chấm sao). `turnIndex` =
   * thứ tự câu trả lời assistant (0-based, KHÔNG đếm lời chào) — khớp thứ tự lưu
   * ở server. Trả null để không hiện gì cho tin đó.
   */
  renderMessageFooter?: (message: Message, turnIndex: number) => ReactNode;
  /** id tin nhắn lời chào fake-stream (không lưu server) → loại khỏi đếm turnIndex. */
  greetingId?: string | null;
  /** Sửa & gửi lại lượt user thứ `turnIndex` (chỉ mode "ai"). */
  onEditUser?: (turnIndex: number, text: string) => void;
  /** Cho phép nút sửa tin user (tắt khi đang stream). */
  canEditUser?: boolean;
};

export function MessageList({
  messages,
  bubbles,
  footer,
  renderMessageFooter,
  greetingId,
  onEditUser,
  canEditUser,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Chỉ TỰ cuộn xuống cuối khi người dùng đang ở sát đáy. Kéo lên (vd để xem dashboard
  // đang vẽ dần) → ngừng ghim; cuộn lại sát đáy → ghim tiếp.
  const stickRef = useRef(true);

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = dist < 80;
  }

  useEffect(() => {
    if (!stickRef.current) return;
    // Cuộn tức thời (không "smooth") để không tạo animation kéo dài tranh chấp với
    // thao tác cuộn tay của người dùng giữa các delta stream.
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto thin-scrollbar px-6 py-6"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {(() => {
          let assistantSeen = 0;
          let userSeen = 0;
          return messages.map((m) => {
            let turnIndex = -1;
            if (m.role === "assistant" && m.id !== greetingId) {
              turnIndex = assistantSeen;
              assistantSeen += 1;
            }
            let userTurnIndex: number | undefined;
            if (m.role === "user") {
              userTurnIndex = userSeen;
              userSeen += 1;
            }
            const msgFooter =
              turnIndex >= 0 ? renderMessageFooter?.(m, turnIndex) : undefined;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                bubbles={bubbles}
                footer={msgFooter ?? undefined}
                userTurnIndex={userTurnIndex}
                onEditUser={onEditUser}
                canEdit={canEditUser}
              />
            );
          });
        })()}
        {footer}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// Buổi theo giờ địa phương: sáng 5–10h, chiều 11–17h, còn lại tối.
function timeOfDay(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "sáng";
  if (h >= 11 && h < 18) return "chiều";
  return "tối";
}

export function EmptyGreeting({ userName }: { userName: string }) {
  // "Chào buổi {buổi}! {tên}" — chưa có tên thì chỉ "Chào buổi {buổi}!".
  // Tên bác sĩ đã kèm chức danh ("BS."/"ThS.BS.") nên không thêm "bác sĩ" nữa.
  const name = userName.trim();
  const heading = `Chào buổi ${timeOfDay()}!${name ? ` ${name}` : ""}`;
  return (
    <div className="flex items-center justify-center gap-3 text-gray-900">
      <AssistantAvatar size={42} className="shrink-0" />
      <h1 className="text-4xl sm:text-4xl font-medium tracking-tight leading-tight">
        {heading}
      </h1>
    </div>
  );
}
