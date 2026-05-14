import { connectDB, client } from "@pr_hospitalagent/api-shared";
import type { Asset, AssetCategory, AssetCondition } from "@pr_hospitalagent/types";

const now = new Date();

type Seed = {
  name: string;
  category: AssetCategory;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  depreciationYears: number;
  condition: AssetCondition;
  notes?: string;
};

const seeds: Seed[] = [
  {
    name: "Máy siêu âm GE Logiq P9",
    category: "Thiết bị y tế",
    location: "Phòng siêu âm 1",
    purchaseDate: "2023-03-15",
    purchasePrice: 850_000_000,
    depreciationYears: 8,
    condition: "Tốt",
    notes: "Bảo hành đến 2027",
  },
  {
    name: "Máy điện tim Nihon Kohden ECG-1250K",
    category: "Thiết bị y tế",
    location: "Phòng khám tim mạch",
    purchaseDate: "2024-01-10",
    purchasePrice: 95_000_000,
    depreciationYears: 7,
    condition: "Tốt",
  },
  {
    name: "Máy xét nghiệm sinh hóa Mindray BS-240",
    category: "Thiết bị y tế",
    location: "Phòng xét nghiệm",
    purchaseDate: "2022-08-05",
    purchasePrice: 320_000_000,
    depreciationYears: 8,
    condition: "Bình thường",
    notes: "Cần hiệu chuẩn định kỳ",
  },
  {
    name: "Bàn khám đa năng inox",
    category: "Nội thất",
    location: "Phòng khám 2",
    purchaseDate: "2024-05-20",
    purchasePrice: 12_500_000,
    depreciationYears: 10,
    condition: "Tốt",
  },
  {
    name: "Tủ đựng thuốc 6 ngăn",
    category: "Nội thất",
    location: "Quầy thuốc",
    purchaseDate: "2023-11-12",
    purchasePrice: 8_900_000,
    depreciationYears: 10,
    condition: "Tốt",
  },
  {
    name: "Ghế chờ inox 4 chỗ x10",
    category: "Nội thất",
    location: "Sảnh chờ",
    purchaseDate: "2022-04-22",
    purchasePrice: 24_000_000,
    depreciationYears: 8,
    condition: "Bình thường",
  },
  {
    name: "Máy tính Dell OptiPlex 7090 x6",
    category: "Máy tính",
    location: "Lễ tân + phòng khám",
    purchaseDate: "2023-09-01",
    purchasePrice: 102_000_000,
    depreciationYears: 5,
    condition: "Tốt",
  },
  {
    name: "Máy in HP LaserJet Pro M404",
    category: "Máy tính",
    location: "Lễ tân",
    purchaseDate: "2022-06-18",
    purchasePrice: 6_500_000,
    depreciationYears: 5,
    condition: "Cần sửa",
    notes: "Hay kẹt giấy",
  },
  {
    name: "Switch mạng Cisco SG350-28P",
    category: "Máy tính",
    location: "Phòng kỹ thuật",
    purchaseDate: "2024-02-14",
    purchasePrice: 18_500_000,
    depreciationYears: 6,
    condition: "Tốt",
  },
  {
    name: "Máy lạnh Daikin Inverter 12000BTU x4",
    category: "Khác",
    location: "Phòng khám 1-4",
    purchaseDate: "2023-04-10",
    purchasePrice: 56_000_000,
    depreciationYears: 8,
    condition: "Tốt",
  },
  {
    name: "Hệ thống camera giám sát 8 kênh",
    category: "Khác",
    location: "Toàn phòng khám",
    purchaseDate: "2022-12-05",
    purchasePrice: 22_000_000,
    depreciationYears: 6,
    condition: "Bình thường",
  },
  {
    name: "Tủ lạnh bảo quản vắc-xin Haier 100L",
    category: "Thiết bị y tế",
    location: "Kho vắc-xin",
    purchaseDate: "2024-07-20",
    purchasePrice: 35_000_000,
    depreciationYears: 7,
    condition: "Tốt",
  },
];

async function nextIds(start: number): Promise<string[]> {
  return seeds.map((_, i) => "TS" + String(start + i).padStart(3, "0"));
}

async function run() {
  const db = await connectDB();
  const collection = db.collection<Asset>("assets");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });

  const ids = await nextIds(1);
  const docs: Asset[] = seeds.map((s, i) => ({
    id: ids[i]!,
    name: s.name,
    category: s.category,
    location: s.location,
    purchaseDate: new Date(s.purchaseDate),
    purchasePrice: s.purchasePrice,
    depreciationYears: s.depreciationYears,
    condition: s.condition,
    notes: s.notes,
    createdAt: now,
  }));

  await collection.insertMany(docs);
  console.log(`Inserted ${docs.length} assets.`);
  await client.close();
}

run().catch((err) => {
  console.error("Seed assets failed:", err);
  process.exit(1);
});
