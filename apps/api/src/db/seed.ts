import { connectDB, client, hashPassword } from "@pr_hospitalagent/api-shared";
import type { Patient } from "@pr_hospitalagent/types";
import { patientSeedSpecs } from "./seeds/patients.data.ts";

async function seed() {
  const patients: Patient[] = patientSeedSpecs.map(({ password, ...rest }) => ({
    ...rest,
    passwordHash: hashPassword(password),
  }));

  const db = await connectDB();
  const collection = db.collection<Patient>("patients");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ username: 1 }, { unique: true });
  const result = await collection.insertMany(patients);
  console.log(`Inserted ${result.insertedCount} patients:`);
  for (const s of patientSeedSpecs) {
    console.log(`  ${s.id}  username=${s.username}  password=${s.password}`);
  }
  await client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
