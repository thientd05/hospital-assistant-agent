import { connectDB } from "@pr_hospitalagent/api-shared";

export async function nextId(
  collection: string,
  prefix: string,
  minLen = 3
): Promise<string> {
  const db = await connectDB();
  const pattern = `^${prefix}\\d+$`;
  const docs = await db
    .collection<{ id: string }>(collection)
    .find({ id: { $regex: pattern } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let maxNum = 0;
  let maxLen = minLen;
  for (const { id } of docs) {
    const m = id.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return prefix + String(maxNum + 1).padStart(Math.max(minLen, maxLen), "0");
}
