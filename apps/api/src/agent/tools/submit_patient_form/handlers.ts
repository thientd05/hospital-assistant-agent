import type { PanelClient } from "../../panel-bridge.ts";

export async function handleSubmitPatientForm(
  _input: Record<string, unknown>,
  panel: PanelClient
): Promise<string> {
  const result = await panel.sendCommand("submit_patient_form", {});
  return JSON.stringify(result);
}
