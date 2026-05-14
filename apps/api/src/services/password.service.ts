import type { AuthRole } from "@pr_hospitalagent/api-shared";
import { hashPassword, verifyPassword } from "@pr_hospitalagent/api-shared";
import { accountRepo } from "../repositories/account.repo.ts";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../lib/errors.ts";

export const passwordService = {
  async change(
    role: AuthRole | undefined,
    id: string | undefined,
    currentPassword: string,
    newPassword: string
  ) {
    if (!role || !id) throw new UnauthorizedError();
    const account = await accountRepo.findById(role, id);
    if (!account) throw new NotFoundError("Tài khoản không tồn tại.");
    if (!verifyPassword(currentPassword, account.passwordHash)) {
      throw new BadRequestError("Mật khẩu hiện tại không đúng.");
    }
    await accountRepo.updatePasswordHash(role, id, hashPassword(newPassword));
    return { ok: true };
  },
};
