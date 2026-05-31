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
import { patientService } from "./patient.service.ts";
import { stripPassword } from "../lib/public.ts";
import { ConflictError, UnauthorizedError } from "../lib/errors.ts";
import type { RegisterInput } from "../schemas/auth.ts";

// Cặp token trả về khi đăng nhập/đăng ký: access ngắn hạn + refresh dài hạn.
export type TokenPair = { token: string; refreshToken: string };
export type SignTokens = (payload: { sub: string; role: AuthRole }) => TokenPair;

export type LoginResult =
  | (TokenPair & { role: "doctor"; doctor: DoctorPublic })
  | (TokenPair & { role: "manager"; manager: ManagerPublic })
  | (TokenPair & { role: "expert"; expert: ExpertPublic })
  | (TokenPair & { role: "patient"; patient: PatientPublic });

function buildResult(
  role: AuthRole,
  account: Doctor | Manager | Expert | Patient,
  tokens: TokenPair
): LoginResult {
  const publicAccount = stripPassword(account);
  switch (role) {
    case "doctor":
      return { ...tokens, role: "doctor", doctor: publicAccount as DoctorPublic };
    case "manager":
      return { ...tokens, role: "manager", manager: publicAccount as ManagerPublic };
    case "expert":
      return { ...tokens, role: "expert", expert: publicAccount as ExpertPublic };
    case "patient":
      return { ...tokens, role: "patient", patient: publicAccount as PatientPublic };
  }
}

export const authService = {
  async login(
    username: string,
    password: string,
    signTokens: SignTokens
  ): Promise<LoginResult> {
    for (const role of LOGIN_ORDER) {
      const account = await accountRepo.findByCredential(role, username);
      if (account && verifyPassword(password, account.passwordHash)) {
        const tokens = signTokens({ sub: account.id, role });
        return buildResult(role, account as never, tokens);
      }
    }
    throw new UnauthorizedError("Sai tên đăng nhập hoặc mật khẩu");
  },

  // Đăng ký công khai — CHỈ tạo bệnh nhân, rồi sign token để đăng nhập ngay.
  async register(
    data: RegisterInput,
    signTokens: SignTokens
  ): Promise<LoginResult> {
    if (await accountRepo.phoneTaken(data.phone)) {
      throw new ConflictError(
        "Số điện thoại đã được đăng ký, vui lòng đăng nhập hoặc dùng số khác."
      );
    }
    const patient = await patientService.register(data);
    const tokens = signTokens({ sub: patient.id, role: "patient" });
    return buildResult("patient", patient, tokens);
  },
};
