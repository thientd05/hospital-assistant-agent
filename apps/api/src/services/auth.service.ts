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

  // Đăng ký công khai — CHỈ tạo bệnh nhân, rồi sign token để đăng nhập ngay.
  async register(
    data: RegisterInput,
    sign: (payload: { sub: string; role: AuthRole }) => string
  ): Promise<LoginResult> {
    if (await accountRepo.usernameTaken(data.username)) {
      throw new ConflictError("Tên đăng nhập đã tồn tại, vui lòng chọn tên khác.");
    }
    const patient = await patientService.register(data);
    const token = sign({ sub: patient.id, role: "patient" });
    return buildResult("patient", patient, token);
  },
};
