"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type SkillData = {
  name: string;
  content: string;
};

export function SkillContent({ data }: { data: SkillData }) {
  return (
    <div className="px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">
        {data.name}
      </div>
      <div className="markdown-body text-sm text-gray-800 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
      </div>
    </div>
  );
}
