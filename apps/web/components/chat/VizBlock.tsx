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

// Dựng chuỗi SVG HỢP LỆ từ phần đang stream để vẽ TĂNG DẦN: lấy từ thẻ mở <svg…>;
// cắt thân tới dấu ">" hoàn chỉnh CUỐI (bỏ tag viết dở); tự đóng </svg>. Trả null nếu
// thẻ mở <svg> chưa khép (chưa vẽ được gì). <g>/<defs> chưa đóng → trình duyệt +
// DOMPurify tự đóng khi parse.
function buildProgressiveSvg(code: string): string | null {
  const open = /<svg[^>]*>/i.exec(code);
  if (!open) return null;
  const openTag = normalizeSvgTag(open[0]);
  let body = code.slice(open.index + open[0].length);
  const closeIdx = body.search(/<\/svg\s*>/i);
  if (closeIdx !== -1) body = body.slice(0, closeIdx);
  else {
    const lastGt = body.lastIndexOf(">");
    body = lastGt === -1 ? "" : body.slice(0, lastGt + 1);
  }
  return `${openTag}${body}</svg>`;
}

// Khi đang stream, thẻ <svg> mang width/height = viewBox ĐẦY ĐỦ → ô chứa lập tức cao
// bằng hình hoàn chỉnh, list chat ghim đáy nên nhảy thẳng xuống cuối. Crop viewBox +
// height xuống đáy nội dung đã vẽ để ô lớn dần từ trên (auto-scroll cuộn theo). Chiều
// cao CHỈ TĂNG (maxBottomRef) — không co lại khi phần tử dở có bbox dao động → đỡ giật.
function cropSvgToContent(svg: SVGSVGElement, maxBottomRef: { current: number }): void {
  try {
    const vb = svg.getAttribute("viewBox");
    if (!vb) return;
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length !== 4 || !p.every((n) => isFinite(n))) return;
    const [vx, vy, vw] = p;
    const c = svg.getBBox();
    if (!c || !isFinite(c.y) || !isFinite(c.height) || c.height <= 0) return;
    const bottom = Math.max(maxBottomRef.current, c.y + c.height);
    maxBottomRef.current = bottom;
    const nh = bottom - vy + 8; // từ mép trên viewBox tới đáy nội dung + lề
    if (nh <= 0) return;
    svg.setAttribute("viewBox", `${vx} ${vy} ${vw} ${nh}`);
    if (svg.getAttribute("height")) svg.setAttribute("height", String(nh));
  } catch {
    /* đo lỗi → giữ nguyên */
  }
}

// Khối ```svg```: render TĂNG DẦN theo stream (kệ agent đặt toạ độ sai), LUÔN sanitize
// (DOMPurify, chống XSS). KHÔNG nắn layout lúc stream — chỉ crop chiều cao cho cuộn
// mượt. CHỈ KHI gen xong (</svg>) mới chạy autofixSvg MỘT lần để sắp xếp/căn chỉnh lại
// toàn bộ. Cập nhật gộp theo animation frame để nhiều delta token chỉ dựng DOM 1 lần.
function VizBlockInner({ code }: Props) {
  const [clean, setClean] = useState<string>("");
  const hostRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(false);
  const maxBottomRef = useRef(0); // chiều cao nội dung lớn nhất đã thấy (chỉ tăng)
  const latestRef = useRef(code);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    latestRef.current = code;
    if (rafRef.current != null) return; // đã có frame chờ → frame đó đọc code mới nhất
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const c = latestRef.current;
      const partial = buildProgressiveSvg(c);
      if (!partial) {
        setClean("");
        return;
      }
      completeRef.current = /<\/svg\s*>/i.test(c);
      setClean(
        DOMPurify.sanitize(partial, {
          USE_PROFILES: { svg: true, svgFilters: true },
        })
      );
    });
  }, [code]);
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // useLayoutEffect: áp TRƯỚC khi trình duyệt vẽ (khỏi nháy). Đang stream → chỉ crop
  // chiều cao; gen xong → nắn layout toàn bộ MỘT lần.
  useLayoutEffect(() => {
    const svg = hostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;
    if (completeRef.current) autofixSvg(svg);
    else cropSvgToContent(svg, maxBottomRef);
  }, [clean]);

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
