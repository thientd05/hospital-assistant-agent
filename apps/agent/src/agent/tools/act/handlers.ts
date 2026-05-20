import type { PanelClient } from "../../panel-bridge.ts";

const ACTIONS = ["click", "type", "select", "check"];

type NormalizedAction = {
  action: string;
  ref: string;
  value?: string;
};

export async function handleAct(
  input: Record<string, unknown>,
  panel: PanelClient
): Promise<string> {
  const raw = input.actions;
  if (!Array.isArray(raw) || raw.length === 0) {
    return JSON.stringify({
      ok: false,
      error: "`actions` phải là một mảng không rỗng.",
    });
  }

  const actions: NormalizedAction[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i] as Record<string, unknown>;
    if (!a || typeof a.action !== "string" || !ACTIONS.includes(a.action)) {
      return JSON.stringify({
        ok: false,
        error: `actions[${i}]: 'action' không hợp lệ (cần click|type|select|check).`,
      });
    }
    if (typeof a.ref !== "string" || !a.ref) {
      return JSON.stringify({
        ok: false,
        error: `actions[${i}]: thiếu 'ref'.`,
      });
    }
    const item: NormalizedAction = { action: a.action, ref: a.ref };
    if (a.value !== undefined && a.value !== null) item.value = String(a.value);
    actions.push(item);
  }

  const result = await panel.sendCommand("act", { actions });
  return JSON.stringify(result);
}
