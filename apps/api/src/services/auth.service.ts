import type {
  Doctor,
  DoctorPublic,
  Expert,
  ExpertPublic,
  Manager,
  ManagerPublic,
  Patient,
  PatientPublic,
} from "@pr_hospitalagent/types";
import type { AuthRole } from "@pr_hospitalagent/api-shared";
import { verifyPassword } from "@pr_hospitalagent/api-shared";
import { accountRepo, LOGIN_ORDER } from "../repositories/account.repo.ts";
import { stripPassword } from "../lib/public.ts";
import { UnauthorizedError } from "../lib/errors.ts";

export type LoginResult =
  | { token: string; role: "doctor"; doctor: DoctorPublic }
  | { token: string; role: "manager"; manager: ManagerPublic }
  | { token: string; role: "expert"; expert: ExpertPublic }
  | { token: string; role: "patient"; patient: PatientPublic };

function buildResult(
  role: AuthRole,
  account: Doctor | Manager | Expert | Patient,
  token: string
): LoginResult {
  const publicAccount = stripPassword(account);
  switch (role) {
    case "doctor":
      return {
        token,
        role: "doctor",
        doctor: publicAccount as DoctorPublic,
      };
    case "manager":
      return {
        token,
        role: "manager",
        manager: publicAccount as ManagerPublic,
      };
    case "expert":
      return {
        token,
        role: "expert",
        expert: publicAccount as ExpertPublic,
      };
    case "patient":
      return {
        token,
        role: "patient",
        patient: publicAccount as PatientPublic,
      };
  }
}

export const authService = {
  async login(
    username: string,
    password: string,
    sign: (payload: { sub: string; role: AuthRole }) => string
  ): Promise<LoginResult> {
    for (const role of LOGIN_ORDER) {
      const account = await accountRepo.findByUsername(role, username);
      if (account && verifyPassword(password, account.passwordHash)) {
        const token = sign({ sub: account.id, role });
        return buildResult(role, account as never, token);
      }
    }
    throw new UnauthorizedError("Sai tên đăng nhập hoặc mật khẩu");
  },
};
