type InteractionRule = {
  match: (drugs: string[]) => boolean;
  message: string;
};

const has = (drugs: string[], keyword: string) =>
  drugs.some((d) => d.toLowerCase().includes(keyword.toLowerCase()));

const rules: InteractionRule[] = [
  {
    match: (d) => has(d, "warfarin") && has(d, "aspirin"),
    message:
      "Warfarin + Aspirin: tăng nguy cơ chảy máu — cần theo dõi INR và cân nhắc thay thế.",
  },
  {
    match: (d) =>
      has(d, "metformin") && (has(d, "contrast") || has(d, "cản quang")),
    message:
      "Metformin + Thuốc cản quang: nguy cơ nhiễm toan lactic — cần ngưng Metformin 48h trước khi tiêm cản quang.",
  },
  {
    match: (d) =>
      (has(d, "ace") ||
        has(d, "captopril") ||
        has(d, "enalapril") ||
        has(d, "lisinopril") ||
        has(d, "ramipril")) &&
      (has(d, "kali") || has(d, "potassium") || has(d, "k+")),
    message:
      "ACE inhibitor + Kali: nguy cơ tăng kali máu — cần theo dõi điện giải đồ.",
  },
];

export function handleCheckDrugInteraction(drugs: string[]): string {
  const matches = rules.filter((r) => r.match(drugs)).map((r) => r.message);
  if (matches.length === 0) {
    return "Không phát hiện tương tác thuốc đáng kể";
  }
  return matches.join("\n");
}
