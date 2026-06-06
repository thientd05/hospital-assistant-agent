import { fetchServicePrices } from "../../api-client.ts";

// Đọc bảng giá dịch vụ khám (tham khảo) từ Mongo qua REST backend.
// Tool đọc thuần — không động DB/panel trực tiếp.
export async function handleReadServicePrices(token: string): Promise<string> {
  const services = await fetchServicePrices(token);
  return JSON.stringify({ count: services.length, services });
}
