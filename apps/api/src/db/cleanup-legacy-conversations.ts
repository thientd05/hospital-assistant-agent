import { connectDB, client } from "./client.ts";

async function main() {
  const db = await connectDB();
  const conversations = db.collection("conversations");
  const result = await conversations.deleteMany({
    doctorId: { $regex: /^(QL|CG)\d+$/i },
  });
  console.log(
    `Đã xoá ${result.deletedCount} conversation legacy (manager/expert).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
