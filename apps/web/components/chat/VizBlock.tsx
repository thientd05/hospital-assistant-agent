"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { autofixSvg } from "@/lib/svg-autofix";

type Props = {
  /** Nội dung khối ```svg```, lớn dần theo từng delta stream. */
  code: string;
};

// Thêm width/height = kích thước viewBox nếu thẻ <svg> thiếu, để SVG render ĐÚNG
// kích thước gốc (scale 1) thay vì bị kéo giãn đầy bề ngang khung chat — tránh chữ
// bên trong bị phóng to hơn text xung quanh. CSS `max-width:100%` vẫn cho thu nhỏ
// trên màn hẹp.
function normalizeSvgTag(tag: string): string {
  if (/\bwidth\s*=/.test(tag)) return tag;
  const vb =
    /viewBox\s*=\s*["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/i.exec(tag);
  if (!vb) return tag;
  return tag.replace(/<svg/i, `<svg width="${vb[1]}" height="${vb[2]}"`);
}

// Lấy chuỗi SVG TRỌN VẸN từ code, CHỈ khi đã có </svg> (đã gen xong). Trả null nếu
// thẻ <svg> chưa khép → chưa render gì (KHÔNG vẽ tăng dần để tránh giật khi stream).
function buildCompleteSvg(code: string): string | null {
  const open = /<svg[^>]*>/i.exec(code);
  if (!open) return null;
  const rest = code.slice(open.index + open[0].length);
  const closeIdx = rest.search(/<\/svg\s*>/i);
  if (closeIdx === -1) return null; // chưa xong → đợi
  return `${normalizeSvgTag(open[0])}${rest.slice(0, closeIdx)}</svg>`;
}

// Khối ```svg```: ĐỢI gen xong (có </svg>) rồi mới sanitize (DOMPurify, loại
// <script>/onload/foreignObject… chống XSS) + render + căn chỉnh MỘT lần. KHÔNG vẽ
// tăng dần theo token — render dở mỗi delta gây giật/nhảy liên tục. Trong lúc stream
// hiện null (không spinner). Sanitize trong effect (chỉ client) để an toàn SSR.
function VizBlockInner({ code }: Props) {
  const [clean, setClean] = useState<string>("");
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const full = buildCompleteSvg(code);
    if (!full) return; // chưa xong → giữ nguyên (chưa render)
    setClean(
      DOMPurify.sanitize(full, {
        USE_PROFILES: { svg: true, svgFilters: true },
      })
    );
  }, [code]);

  // SVG đã nằm trong DOM → nắn layout MỘT lần (thu chữ tràn ô, đẩy giãn phần tử chồng
  // nhau, nới ô/khung). useLayoutEffect để áp TRƯỚC khi trình duyệt vẽ (khỏi nháy).
  useLayoutEffect(() => {
    const svg = hostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (svg) autofixSvg(svg);
  }, [clean]);

  // Chưa gen xong → không hiện gì (KHÔNG spinner).
  if (!clean) return null;
  return (
    <div
      ref={hostRef}
      className="viz-block"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export const VizBlock = memo(VizBlockInner);
