import { randomUUID } from "node:crypto";

export type PanelCommandFrame = {
  type: "tool_command";
  commandId: string;
  command: string;
  args: unknown;
};

export type PanelClient = {
  sendCommand(name: string, args: unknown): Promise<unknown>;
};

type Pending = {
  ownerId: string;
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

// 30s: PHẢI nhỏ hơn maxDuration của serverless function (Vercel agent = 60s).
// Nếu để bằng 60s, khi panel không phản hồi thì function bị Vercel giết ĐÚNG
// lúc timeout sắp fire → agent chết im lặng, không kịp trả lỗi/đóng stream.
// Đặt 30s cho agent kịp nhận lỗi graceful, báo lại, rồi lưu hội thoại trong
// phần ngân sách 60s còn lại. Một batch `act` bình thường chỉ mất vài giây.
const TIMEOUT_MS = 30_000;
const pending = new Map<string, Pending>();

export function createPanelClient(
  ownerId: string,
  send: (frame: PanelCommandFrame) => void
): PanelClient {
  return {
    sendCommand(name, args) {
      return new Promise((resolve, reject) => {
        const commandId = randomUUID();
        const timer = setTimeout(() => {
          pending.delete(commandId);
          reject(
            new Error(
              `Panel không phản hồi command "${name}" trong ${TIMEOUT_MS}ms.`
            )
          );
        }, TIMEOUT_MS);
        pending.set(commandId, { ownerId, resolve, reject, timer });
        try {
          send({ type: "tool_command", commandId, command: name, args });
        } catch (err) {
          clearTimeout(timer);
          pending.delete(commandId);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },
  };
}

export type ResolveOutcome = "ok" | "not-found" | "wrong-owner";

export function resolvePanelCommand(
  commandId: string,
  ownerId: string,
  result: unknown
): ResolveOutcome {
  const p = pending.get(commandId);
  if (!p) return "not-found";
  if (p.ownerId !== ownerId) return "wrong-owner";
  pending.delete(commandId);
  clearTimeout(p.timer);
  p.resolve(result);
  return "ok";
}
