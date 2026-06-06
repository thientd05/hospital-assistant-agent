import { fetchExamHistory } from "../../api-client.ts";

// Đọc lịch sử khám của 1 bệnh nhân từ Mongo qua REST backend (forward JWT).
// Tool đọc thuần — không động panel/DB trực tiếp.
export async function handleReadExamHistory(
  input: Record<string, unknown>,
  token: string
): Promise<string> {
  const patientId = typeof input.patientId === "string" ? input.patientId : "";
  if (!patientId) {
    return JSON.stringify({
      error: "Thiếu patientId — đọc panel để lấy mã bệnh nhân đang chọn trước.",
    });
  }
  const data = await fetchExamHistory(token, patientId);
  return JSON.stringify(data);
}
