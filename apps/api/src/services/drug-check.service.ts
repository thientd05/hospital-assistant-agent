export type DrugCatalogItem = { id: string; name: string; category: string };

// Danh mục thuốc chọn được ở tab "Tương tác thuốc". `id` là khoá ổn định (khớp
// rule + ref panel), `name` là nhãn hiển thị. Rule khớp theo id (không còn dò
// chuỗi con trên tên — tránh false-positive kiểu "paracetamol" chứa "ace").
const CATALOG: DrugCatalogItem[] = [
  { id: "warfarin", name: "Warfarin", category: "Chống đông / kháng kết tập tiểu cầu" },
  { id: "aspirin", name: "Aspirin", category: "Chống đông / kháng kết tập tiểu cầu" },
  { id: "clopidogrel", name: "Clopidogrel", category: "Chống đông / kháng kết tập tiểu cầu" },
  { id: "metformin", name: "Metformin", category: "Đái tháo đường" },
  { id: "contrast", name: "Thuốc cản quang", category: "Chẩn đoán hình ảnh" },
  { id: "captopril", name: "Captopril", category: "Ức chế men chuyển (ACE)" },
  { id: "enalapril", name: "Enalapril", category: "Ức chế men chuyển (ACE)" },
  { id: "lisinopril", name: "Lisinopril", category: "Ức chế men chuyển (ACE)" },
  { id: "ramipril", name: "Ramipril", category: "Ức chế men chuyển (ACE)" },
  { id: "kali", name: "Kali clorid (KCl)", category: "Điện giải" },
  { id: "ibuprofen", name: "Ibuprofen", category: "Giảm đau / kháng viêm (NSAID)" },
  { id: "paracetamol", name: "Paracetamol", category: "Giảm đau / hạ sốt" },
  { id: "amoxicillin", name: "Amoxicillin", category: "Kháng sinh" },
  { id: "simvastatin", name: "Simvastatin", category: "Rối loạn lipid" },
];

const NAME_BY_ID = new Map(CATALOG.map((d) => [d.id, d.name]));

const ACE = ["captopril", "enalapril", "lisinopril", "ramipril"];

type InteractionRule = {
  match: (ids: Set<string>) => boolean;
  message: string;
};

const rules: InteractionRule[] = [
  {
    match: (s) => s.has("warfarin") && s.has("aspirin"),
    message:
      "Warfarin + Aspirin: tăng nguy cơ chảy máu — cần theo dõi INR và cân nhắc thay thế.",
  },
  {
    match: (s) => s.has("warfarin") && s.has("ibuprofen"),
    message:
      "Warfarin + Ibuprofen (NSAID): tăng nguy cơ chảy máu tiêu hoá — hạn chế dùng chung, ưu tiên Paracetamol để giảm đau.",
  },
  {
    match: (s) => s.has("clopidogrel") && s.has("aspirin"),
    message:
      "Clopidogrel + Aspirin: kháng kết tập tiểu cầu kép — tăng nguy cơ chảy máu, chỉ phối hợp khi có chỉ định rõ và theo dõi sát.",
  },
  {
    match: (s) => s.has("metformin") && s.has("contrast"),
    message:
      "Metformin + Thuốc cản quang: nguy cơ nhiễm toan lactic — cần ngưng Metformin 48h trước khi tiêm cản quang.",
  },
  {
    match: (s) => ACE.some((a) => s.has(a)) && s.has("kali"),
    message:
      "Thuốc ức chế men chuyển (ACE) + Kali: nguy cơ tăng kali máu — cần theo dõi điện giải đồ.",
  },
];

export const drugCheckService = {
  catalog(): DrugCatalogItem[] {
    return CATALOG;
  },

  check(drugIds: string[]) {
    const ids = new Set(drugIds);
    const names = drugIds.map((id) => NAME_BY_ID.get(id) ?? id);
    const matches = rules.filter((r) => r.match(ids)).map((r) => r.message);
    const hasInteraction = matches.length > 0;
    return {
      drugs: names,
      hasInteraction,
      message: hasInteraction
        ? matches.join("\n")
        : "Không phát hiện tương tác thuốc đáng kể",
      interactions: matches,
    };
  },
};
