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
