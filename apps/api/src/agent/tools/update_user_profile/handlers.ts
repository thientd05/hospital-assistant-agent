import { writeWorkspaceFile } from "../shared.ts";

export function handleUpdateUserProfile(
  doctorId: string,
  content: string
): string {
  return writeWorkspaceFile(doctorId, "USER.md", content);
}
