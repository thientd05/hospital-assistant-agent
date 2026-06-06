"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import DOMPurify from "dompurify";

type Props = {
  /** "mermaid" → sơ đồ Mermaid; "svg" → vẽ tự do (SVG đã sanitize). */
  language: "mermaid" | "svg";
  /** Nội dung khối code, lớn dần theo từng delta stream. */
  code: string;
};

const PLACEHOLDER = (
  <div className="viz-block viz-placeholder" aria-label="đang vẽ">
    <span className="viz-spinner" /> đang vẽ…
  </div>
);

// Render Mermaid theo thời gian thực: mỗi lần `code` đổi (mỗi delta stream) thử
// parse — chỉ vẽ khi cú pháp đã hợp lệ trọn vẹn, còn dở thì giữ placeholder. Vì
// vậy hình "bật ra" ngay khi khối khép, ngay giữa luồng stream.
function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const rawId = useId();
  // id phải hợp lệ cho querySelector của mermaid (bỏ ký tự ":").
  const renderId = useRef(`viz-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`).current;

  useEffect(() => {
    let cancelled = false;
    const trimmed = code.trim();
    if (!trimmed) {
      setSvg("");
      return;
    }
    // Debounce nhẹ để không gọi render quá dày khi token tới nhanh.
    const timer = setTimeout(async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "default",
          fontFamily: "inherit",
        });
        // parse ném lỗi nếu cú pháp chưa hợp lệ (đang stream dở) → giữ placeholder.
        await mermaid.parse(trimmed);
        const { svg: out } = await mermaid.render(renderId, trimmed);
        if (!cancelled) setSvg(out);
      } catch {
        // chưa hợp lệ — không xoá hình cũ (nếu có) để tránh nhấp nháy.
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, renderId]);

  if (!svg) return PLACEHOLDER;
  return (
    <div
      className="viz-block markdown-body"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// SVG tự do: chỉ render khi đã có thẻ đóng </svg> (chuỗi well-formed) và LUÔN
// sanitize bằng DOMPurify (loại <script>/onload/foreignObject…) chống XSS.
// Sanitize trong effect (chỉ client) để an toàn SSR — DOMPurify cần `window`.
function SvgBlock({ code }: { code: string }) {
  const [clean, setClean] = useState<string>("");
  useEffect(() => {
    if (!/<\/svg\s*>/i.test(code)) {
      setClean("");
      return;
    }
    setClean(
      DOMPurify.sanitize(code, { USE_PROFILES: { svg: true, svgFilters: true } })
    );
  }, [code]);

  if (!clean) return PLACEHOLDER;
  return (
    <div className="viz-block" dangerouslySetInnerHTML={{ __html: clean }} />
  );
}

function VizBlockInner({ language, code }: Props) {
  return language === "mermaid" ? (
    <MermaidBlock code={code} />
  ) : (
    <SvgBlock code={code} />
  );
}

export const VizBlock = memo(VizBlockInner);
