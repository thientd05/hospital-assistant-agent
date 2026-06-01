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
  "home-vitals",
];

export async function handleReadPanel(
  input: Record<string, unknown>,
  panel: PanelClient
): Promise<string> {
  const args: Record<string, unknown> = {};
  if (typeof input.tab === "string" && TABS.includes(input.tab)) {
    args.tab = input.tab;
  }
  const result = await panel.sendCommand("read_panel", args);
  return JSON.stringify(result);
}
