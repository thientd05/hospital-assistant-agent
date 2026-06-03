// Kiểm tra tương tác giữa các thuốc bác sĩ chọn từ danh mục `medications` (TH00X).
// Input là TÊN thuốc (vd "Aspirin 81mg"); rule dò theo hoạt chất trong tên —
// tên thuốc trong danh mục đều chứa hoạt chất nên khớp chuỗi con là đủ.
type InteractionRule = {
  match: (drugs: string[]) => boolean;
  message: string;
};

const has = (drugs: string[], keyword: string) =>
  drugs.some((d) => d.toLowerCase().includes(keyword.toLowerCase()));

const hasAny = (drugs: string[], keywords: string[]) =>
  keywords.some((k) => has(drugs, k));

// Hoạt chất theo nhóm — bám đúng các thuốc CÓ trong danh mục seed.
const NSAID = ["ibuprofen", "diclofenac"];
const ACE_ARB = ["enalapril", "losartan"]; // ức chế men chuyển / chẹn thụ thể
const ANTIPLATELET = ["aspirin", "clopidogrel"];

const rules: InteractionRule[] = [
  {
    match: (d) => has(d, "aspirin") && has(d, "clopidogrel"),
    message:
      "Aspirin + Clopidogrel: kháng kết tập tiểu cầu kép — tăng nguy cơ chảy máu, chỉ phối hợp khi có chỉ định rõ và theo dõi sát.",
  },
  {
    match: (d) => hasAny(d, ANTIPLATELET) && hasAny(d, NSAID),
    message:
      "Thuốc kháng kết tập tiểu cầu (Aspirin/Clopidogrel) + NSAID (Ibuprofen/Diclofenac): tăng nguy cơ chảy máu tiêu hoá; Ibuprofen còn làm giảm tác dụng bảo vệ tim của Aspirin — ưu tiên Paracetamol để giảm đau.",
  },
  {
    match: (d) => hasAny(d, ACE_ARB) && has(d, "spironolactone"),
    message:
      "Ức chế men chuyển/ARB (Enalapril/Losartan) + Spironolactone: nguy cơ tăng kali máu — cần theo dõi điện giải đồ và chức năng thận.",
  },
  {
    match: (d) => hasAny(d, ACE_ARB) && hasAny(d, NSAID),
    message:
      "Ức chế men chuyển/ARB (Enalapril/Losartan) + NSAID (Ibuprofen/Diclofenac): giảm tác dụng hạ áp và có thể suy giảm chức năng thận — hạn chế phối hợp.",
  },
];

export const drugCheckService = {
  check(drugs: string[]) {
    const matches = rules.filter((r) => r.match(drugs)).map((r) => r.message);
    const hasInteraction = matches.length > 0;
    return {
      drugs,
      hasInteraction,
      message: hasInteraction
        ? matches.join("\n")
        : "Không phát hiện tương tác thuốc đáng kể",
      interactions: matches,
    };
  },
};
