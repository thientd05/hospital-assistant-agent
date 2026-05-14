export type RefreshTarget =
  | "patients"
  | "patient"
  | "lab"
  | "appointments"
  | "stats"
  | "doctors"
  | "doctor"
  | "experts"
  | "expert"
  | "skills"
  | "skill"
  | false;

export const TOOL_REFRESH_MAP: Record<string, RefreshTarget> = {
  tool_example: false,
  // Panel-control tools: panel tự bump tab khi tự xử lý xong, nên backend không
  // cần bắn refresh — để false tránh double-bump.
  open_patient_form: false,
  submit_patient_form: false,
  // File-read tool: không động DB/panel.
  read_skill: false,
};

export function getRefreshTarget(toolName: string): RefreshTarget {
  return TOOL_REFRESH_MAP[toolName] ?? false;
}
