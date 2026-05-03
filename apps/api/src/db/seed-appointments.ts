import { connectDB, client } from "./client.ts";
import type { Appointment } from "@pr_hospitalagent/types";

const now = new Date();

function at(daysFromNow: number, hour: number, minute: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const seeds: Appointment[] = [
  {
    id: "APT001",
    patientId: "BN001",
    doctorId: "BS001",
    scheduledAt: at(1, 8, 0),
    reason: "Tái khám tăng huyết áp, kiểm tra HA và điều chỉnh thuốc",
    status: "Chờ duyệt",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "APT002",
    patientId: "BN002",
    doctorId: "BS001",
    scheduledAt: at(2, 9, 30),
    reason: "Đánh giá sau đợt nhồi máu cơ tim, xem ECG",
    status: "Đã duyệt",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "APT003",
    patientId: "BN004",
    doctorId: "BS002",
    scheduledAt: at(1, 14, 0),
    reason: "Theo dõi COPD đợt cấp, kiểm tra SpO2 và khí máu",
    status: "Chờ duyệt",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "APT004",
    patientId: "BN007",
    doctorId: "BS003",
    scheduledAt: at(-2, 10, 0),
    reason: "Tái khám sốt xuất huyết, đếm tiểu cầu",
    status: "Thành công",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "APT005",
    patientId: "BN006",
    doctorId: "BS002",
    scheduledAt: at(3, 15, 30),
    reason: "Hội chẩn tiền sản giật, đo HA và protein niệu",
    status: "Đã duyệt",
    createdAt: now,
    updatedAt: now,
  },
];

async function seed() {
  const db = await connectDB();
  const collection = db.collection<Appointment>("appointments");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ doctorId: 1 });
  await collection.createIndex({ patientId: 1 });
  const result = await collection.insertMany(seeds);
  console.log(`Inserted ${result.insertedCount} appointments:`);
  for (const a of seeds) {
    console.log(
      `  ${a.id}  patient=${a.patientId}  doctor=${a.doctorId}  ${a.scheduledAt.toISOString()}  status="${a.status}"`
    );
  }
  await client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
