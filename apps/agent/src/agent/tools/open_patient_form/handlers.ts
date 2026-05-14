import type { PanelClient } from "../../panel-bridge.ts";

export async function handleOpenPatientForm(
  input: Record<string, unknown>,
  panel: PanelClient
): Promise<string> {
  const args: Record<string, unknown> = {};
  if (typeof input.name === "string") args.name = input.name;
  if (input.age !== undefined && input.age !== null) args.age = String(input.age);
  if (input.gender === "Nam" || input.gender === "Nữ") args.gender = input.gender;
  if (typeof input.ward === "string") args.ward = input.ward;
  if (typeof input.medications === "string") args.medications = input.medications;
  if (input.spO2 !== undefined && input.spO2 !== null) args.spO2 = String(input.spO2);
  if (input.heartRate !== undefined && input.heartRate !== null)
    args.heartRate = String(input.heartRate);
  if (typeof input.bloodPressure === "string")
    args.bloodPressure = input.bloodPressure;
  if (input.temperature !== undefined && input.temperature !== null)
    args.temperature = String(input.temperature);
  const result = await panel.sendCommand("open_patient_form", args);
  return JSON.stringify(result);
}
