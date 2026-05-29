import { Sparkles } from "lucide-react";

type Props = {
  /** Cạnh của khung vuông (px). Icon chiếm ~70% như ở landing. */
  size?: number;
  className?: string;
};

/**
 * Avatar của trợ lý AI — tia Sparkles màu brand, đồng bộ với chat mẫu ở
 * landing page (`components/landing/MockChatPanel.tsx`). Dùng chung cho
 * sidebar chat, header lời chào và sidebar admin.
 */
export function AssistantAvatar({ size = 24, className = "" }: Props) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center text-brand-600 ${className}`}
      style={{ width: size, height: size }}
    >
      <Sparkles
        strokeWidth={2}
        style={{ width: Math.round(size * 0.7), height: Math.round(size * 0.7) }}
      />
    </span>
  );
}
