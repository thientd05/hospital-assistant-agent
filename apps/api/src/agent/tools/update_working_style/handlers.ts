import { writeWorkspaceFile } from "../shared.ts";

export function handleUpdateWorkingStyle(
  doctorId: string,
  content: string
): string {
  return writeWorkspaceFile(doctorId, "SOUL.md", content);
}
