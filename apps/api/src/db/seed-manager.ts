import { connectDB, client } from "./client.ts";
import { hashPassword } from "../auth/password.ts";
import type { Manager } from "@pr_hospitalagent/types";

const now = new Date();

const seed = {
  id: "QL001",
  username: "ql001",
  password: "matkhauql001",
  fullName: "Phạm Thanh Tùng",
  title: "Giám đốc phòng khám",
  clinicName: "Phòng khám Đa khoa Hồng Đức",
  phone: "0987654321",
  email: "tung.pham@hongduc-clinic.vn",
  address: "168 Nguyễn Văn Cừ, Quận 5, TP.HCM",
} as const;

const manager: Manager = {
  id: seed.id,
  username: seed.username,
  passwordHash: hashPassword(seed.password),
  fullName: seed.fullName,
  title: seed.title,
  clinicName: seed.clinicName,
  phone: seed.phone,
  email: seed.email,
  address: seed.address,
  createdAt: now,
};

async function run() {
  const db = await connectDB();
  const collection = db.collection<Manager>("managers");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ username: 1 }, { unique: true });
  await collection.insertOne(manager);
  console.log(`Inserted 1 manager:`);
  console.log(`  ${seed.id}  username=${seed.username}  password=${seed.password}`);
  await client.close();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
