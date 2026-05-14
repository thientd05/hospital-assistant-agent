import { connectDB, client } from "@pr_hospitalagent/api-shared";
import { hashPassword } from "@pr_hospitalagent/api-shared";
import type { Doctor } from "@pr_hospitalagent/types";

const now = new Date();

const seeds = [
  {
    id: "BS001",
    username: "bs001",
    password: "matkhau001",
    fullName: "BS. Trần Quang Minh",
    title: "Bác sĩ chuyên khoa I",
    department: "Nội Tim mạch",
    specialty: "Suy tim, tăng huyết áp, rối loạn nhịp",
    phone: "0901234567",
    email: "minh.tran@hospital.vn",
    address: "12 Lê Lợi, Quận 1, TP.HCM",
    workspaceDir: "workspaces/BS001",
  },
  {
    id: "BS002",
    username: "bs002",
    password: "matkhau002",
    fullName: "ThS.BS. Nguyễn Thị Hương",
    title: "Thạc sĩ, Bác sĩ",
    department: "Cấp cứu",
    specialty: "Hồi sức cấp cứu, chấn thương",
    phone: "0912345678",
    email: "huong.nguyen@hospital.vn",
    address: "45 Nguyễn Trãi, Quận 5, TP.HCM",
    workspaceDir: "workspaces/BS002",
  },
  {
    id: "BS003",
    username: "bs003",
    password: "matkhau003",
    fullName: "BS. Lê Hoàng Nam",
    title: "Bác sĩ",
    department: "Nhi",
    specialty: "Nhi tổng quát, sốt xuất huyết",
    phone: "0923456789",
    email: "nam.le@hospital.vn",
    address: "78 Hai Bà Trưng, Quận 3, TP.HCM",
    workspaceDir: "workspaces/BS003",
  },
] as const;

const doctors: Doctor[] = seeds.map(({ password, ...rest }) => ({
  ...rest,
  passwordHash: hashPassword(password),
  createdAt: now,
}));

async function seed() {
  const db = await connectDB();
  const collection = db.collection<Doctor>("doctors");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ username: 1 }, { unique: true });
  const result = await collection.insertMany(doctors);
  console.log(`Inserted ${result.insertedCount} doctors:`);
  for (const s of seeds) {
    console.log(`  ${s.id}  username=${s.username}  password=${s.password}  workspace=${s.workspaceDir}`);
  }
  await client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
