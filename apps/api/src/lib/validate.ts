import type { ZodTypeAny, z } from "zod";
import { BadRequestError } from "./errors.ts";

export function parseBody<S extends ZodTypeAny>(
  schema: S,
  body: unknown
): z.infer<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Lấy message của lỗi đầu tiên (đã viết tiếng Việt trong schema) làm error
    // chính để FE hiện rõ "Mật khẩu phải có ít nhất 6 ký tự." thay vì "Invalid body".
    const first = parsed.error.issues[0];
    const message = first?.message || "Dữ liệu không hợp lệ";
    throw new BadRequestError(message, parsed.error);
  }
  return parsed.data;
}
