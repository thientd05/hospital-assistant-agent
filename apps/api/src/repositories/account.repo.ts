import type { AuthRole } from "@pr_hospitalagent/api-shared";
import { connectDB } from "@pr_hospitalagent/api-shared";

type AccountDoc = {
  id: string;
  username?: string;
  passwordHash: string;
} & Record<string, unknown>;

const ROLE_COLLECTION: Record<AuthRole, string> = {
  doctor: "doctors",
  manager: "managers",
  expert: "experts",
  patient: "patients",
};

// Login lookup chain order (matches legacy behaviour).
export const LOGIN_ORDER: AuthRole[] = [
  "doctor",
  "manager",
  "expert",
  "patient",
];

export const accountRepo = {
  collectionFor(role: AuthRole) {
    return ROLE_COLLECTION[role];
  },

  // Tra cứu theo "định danh đăng nhập": nhân viên (doctor/manager/expert) dùng
  // username; bệnh nhân tự đăng ký KHÔNG có username nên đăng nhập bằng `phone`
  // (BN do bác sĩ tạo vẫn có username = id → khớp $or).
  async findByCredential(role: AuthRole, credential: string) {
    const db = await connectDB();
    const filter =
      role === "patient"
        ? { $or: [{ username: credential }, { phone: credential }] }
        : { username: credential };
    return db.collection<AccountDoc>(ROLE_COLLECTION[role]).findOne(filter);
  },

  // SĐT đã có bệnh nhân nào dùng chưa (khoá đăng nhập của BN → phải unique).
  async phoneTaken(phone: string) {
    const db = await connectDB();
    const found = await db
      .collection<AccountDoc>(ROLE_COLLECTION.patient)
      .findOne({ phone });
    return found !== null;
  },

  async findById(role: AuthRole, id: string) {
    const db = await connectDB();
    return db.collection<AccountDoc>(ROLE_COLLECTION[role]).findOne({ id });
  },

  async updatePasswordHash(role: AuthRole, id: string, passwordHash: string) {
    const db = await connectDB();
    await db
      .collection(ROLE_COLLECTION[role])
      .updateOne({ id }, { $set: { passwordHash } });
  },
};
