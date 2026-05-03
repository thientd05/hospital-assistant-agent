"use client";

import { useState } from "react";

type Section = {
  key: "s" | "o" | "a" | "p";
  letter: string;
  name: string;
  placeholder: string;
};

const SECTIONS: Section[] = [
  {
    key: "s",
    letter: "S",
    name: "Subjective",
    placeholder: "Bệnh nhân khai...",
  },
  {
    key: "o",
    letter: "O",
    name: "Objective",
    placeholder: "Khám lâm sàng, sinh hiệu, xét nghiệm...",
  },
  {
    key: "a",
    letter: "A",
    name: "Assessment",
    placeholder: "Đánh giá, chẩn đoán phân biệt...",
  },
  {
    key: "p",
    letter: "P",
    name: "Plan",
    placeholder: "Kế hoạch xử trí, theo dõi, tái khám...",
  },
];

export function SoapNote() {
  const [values, setValues] = useState<Record<Section["key"], string>>({
    s: "",
    o: "",
    a: "",
    p: "",
  });
  const [copied, setCopied] = useState(false);

  const update = (k: Section["key"], v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleCopy = async () => {
    const text = SECTIONS.map(
      (s) => `${s.letter} — ${s.name}\n${values[s.key] || "(trống)"}`
    ).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-5">
      {SECTIONS.map((s) => (
        <div key={s.key}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="font-bold text-gray-900">{s.letter}</span>
            <span className="text-xs text-gray-500">{s.name}</span>
          </div>
          <textarea
            value={values[s.key]}
            onChange={(e) => update(s.key, e.target.value)}
            rows={4}
            placeholder={s.placeholder}
            className="w-full text-sm resize-none border-b border-gray-200 focus:border-gray-400 outline-none bg-transparent py-1 placeholder-gray-400"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        className="self-start text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
      >
        {copied ? "Đã copy!" : "Copy note"}
      </button>
    </div>
  );
}
