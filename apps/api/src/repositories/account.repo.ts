import type { AuthRole } from "@pr_hospitalagent/api-shared";
import { connectDB } from "@pr_hospitalagent/api-shared";

type AccountDoc = {
  id: string;
  username: string;
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

  async findByUsername(role: AuthRole, username: string) {
    const db = await connectDB();
    return db
      .collection<AccountDoc>(ROLE_COLLECTION[role])
      .findOne({ username });
  },

  // Username phải unique cross-collection (cùng thứ tự với login chain).
  async usernameTaken(username: string) {
    for (const role of LOGIN_ORDER) {
      const found = await accountRepo.findByUsername(role, username);
      if (found) return true;
    }
    return false;
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
