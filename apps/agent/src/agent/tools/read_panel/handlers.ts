import type { PanelClient } from "../../panel-bridge.ts";

export async function handleReadPanel(
  _input: Record<string, unknown>,
  panel: PanelClient
): Promise<string> {
  const result = await panel.sendCommand("read_panel", {});
  return JSON.stringify(result);
}
