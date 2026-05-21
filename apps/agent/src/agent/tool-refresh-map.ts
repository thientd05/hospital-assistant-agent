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
  // Generic panel-control tools: agent thao tác DOM thật, click button thật chạy
  // lại đúng handler có sẵn (validate + REST + refetch/bumpTab), nên backend KHÔNG
  // cần bắn refresh — để false tránh double-bump.
  open_panel: false,
  read_panel: false,
  act: false,
  // File-read tool: không động DB/panel.
  read_skill: false,
  // File-write tool: ghi workspace của user, không động DB/panel.
  update_workspace_file: false,
};

export function getRefreshTarget(toolName: string): RefreshTarget {
  return TOOL_REFRESH_MAP[toolName] ?? false;
}
