import { connectDB, client } from "./client.ts";
import { hashPassword } from "../auth/password.ts";
import type { Expert } from "@pr_hospitalagent/types";

const now = new Date();

const seeds = [
  {
    id: "CG001",
    username: "cg001",
    password: "matkhaucg001",
    fullName: "Trần Minh Khoa",
    title: "Chuyên gia huấn luyện AI",
    expertise: "Prompt engineering — y khoa",
    phone: "0901234567",
    email: "khoa.tran@hospitalai.vn",
    address: "45 Lê Duẩn, Quận 1, TP.HCM",
  },
  {
    id: "CG002",
    username: "cg002",
    password: "matkhaucg002",
    fullName: "Nguyễn Thị Lan",
    title: "Chuyên gia quy trình lâm sàng",
    expertise: "Quy trình khám bệnh & chuẩn hoá giao tiếp",
    phone: "0912345678",
    email: "lan.nguyen@hospitalai.vn",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  },
  {
    id: "CG003",
    username: "cg003",
    password: "matkhaucg003",
    fullName: "Phạm Đức Thành",
    title: "Chuyên gia dữ liệu y tế",
    expertise: "Chuẩn hoá dữ liệu & kiểm soát chất lượng AI",
    phone: "0923456789",
    email: "thanh.pham@hospitalai.vn",
    address: "88 Điện Biên Phủ, Quận 3, TP.HCM",
  },
] as const;

async function run() {
  const db = await connectDB();
  const collection = db.collection<Expert>("experts");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ username: 1 }, { unique: true });

  const docs: Expert[] = seeds.map((s) => ({
    id: s.id,
    username: s.username,
    passwordHash: hashPassword(s.password),
    fullName: s.fullName,
    title: s.title,
    expertise: s.expertise,
    phone: s.phone,
    email: s.email,
    address: s.address,
    createdAt: now,
  }));

  await collection.insertMany(docs);
  console.log(`Inserted ${seeds.length} experts:`);
  for (const s of seeds) {
    console.log(`  ${s.id}  username=${s.username}  password=${s.password}`);
  }
  await client.close();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
