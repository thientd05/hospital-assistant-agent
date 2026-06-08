import type { PanelClient } from "../../panel-bridge.ts";

const TABS = [
  "patients",
  "patient",
  "lab",
  "appointments",
  "drug-check",
  "my-record",
  "my-labs",
  "my-appointments",
];

export async function handleReadPanel(
  input: Record<string, unknown>,
  panel: PanelClient
): Promise<string> {
  const args: Record<string, unknown> = {};
  if (typeof input.tab === "string" && TABS.includes(input.tab)) {
    args.tab = input.tab;
  }
  if (input.mode === "public" || input.mode === "silent") {
    args.mode = input.mode;
  }
  const result = await panel.sendCommand("read_panel", args);
  return JSON.stringify(result);
}
