"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { autofixSvg } from "@/lib/svg-autofix";

type Props = {
  /** Nội dung khối ```svg```, lớn dần theo từng delta stream. */
  code: string;
};

// Dựng một chuỗi SVG HỢP LỆ từ phần đang stream để vẽ TĂNG DẦN (progressive):
// mỗi phần tử con (rect/line/path…) vừa stream xong là render ngay, không đợi cả
// khối. Cách làm: lấy từ thẻ mở <svg ...> hoàn chỉnh; cắt phần thân tới dấu ">"
// hoàn chỉnh CUỐI CÙNG (bỏ tag đang viết dở); tự đóng </svg>. Trả null nếu thẻ mở
// <svg> chưa khép (chưa vẽ được gì).
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

function buildProgressiveSvg(code: string): string | null {
  const open = /<svg[^>]*>/i.exec(code);
  if (!open) return null;
  const openTag = normalizeSvgTag(open[0]);
  let body = code.slice(open.index + open[0].length);
  const closeIdx = body.search(/<\/svg\s*>/i);
  if (closeIdx !== -1) {
    body = body.slice(0, closeIdx); // đã có </svg> → lấy trọn thân
  } else {
    const lastGt = body.lastIndexOf(">"); // chưa khép → cắt tới tag hoàn chỉnh cuối
    body = lastGt === -1 ? "" : body.slice(0, lastGt + 1);
  }
  // <g>/<defs>… chưa đóng sẽ được trình duyệt + DOMPurify tự đóng khi parse.
  return `${openTag}${body}</svg>`;
}

// Khi SVG còn đang stream (chưa có </svg>), thẻ <svg> đã mang width/height = kích
// thước viewBox ĐẦY ĐỦ → ô chứa lập tức cao bằng hình hoàn chỉnh, list chat ghim
// đáy nên nhảy thẳng xuống cuối, không thấy vẽ từ trên. Khắc phục: crop viewBox +
// height xuống đúng phần NỘI DUNG đã vẽ (đo getBBox) để ô lớn dần từng hình; auto-
// scroll bám đáy sẽ cuộn theo từng hình mới. Vẽ xong (complete) → KHÔNG crop, giữ
// trọn canvas agent thiết kế.
function cropSvgToContent(svg: SVGSVGElement): void {
  try {
    const vb = svg.getAttribute("viewBox");
    if (!vb) return;
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length !== 4 || !p.every((n) => isFinite(n))) return;
    const [vx, vy, vw] = p;
    const c = svg.getBBox();
    if (!c || !isFinite(c.y) || !isFinite(c.height) || c.height <= 0) return;
    const nh = c.y + c.height - vy + 8; // từ mép trên viewBox tới đáy nội dung + lề
    if (nh <= 0) return;
    svg.setAttribute("viewBox", `${vx} ${vy} ${vw} ${nh}`);
    if (svg.getAttribute("height")) svg.setAttribute("height", String(nh));
  } catch {
    /* đo lỗi → giữ nguyên */
  }
}

// Khối ```svg```: render TĂNG DẦN theo từng delta stream (mỗi hình vừa stream xong
// hiện ngay, như gen token) và LUÔN sanitize bằng DOMPurify (loại
// <script>/onload/foreignObject…) chống XSS. Sanitize trong effect (chỉ client) để
// an toàn SSR — DOMPurify cần `window`. KHÔNG hiện spinner/loading.
function VizBlockInner({ code }: Props) {
  const [clean, setClean] = useState<string>("");
  const hostRef = useRef<HTMLDivElement>(null);
  // Đã có </svg> = vẽ xong → khỏi crop chiều cao theo nội dung (giữ trọn canvas).
  const completeRef = useRef(false);
  useEffect(() => {
    const partial = buildProgressiveSvg(code);
    if (!partial) {
      setClean("");
      return;
    }
    completeRef.current = /<\/svg\s*>/i.test(code);
    setClean(
      DOMPurify.sanitize(partial, {
        USE_PROFILES: { svg: true, svgFilters: true },
      })
    );
  }, [code]);

  // Sau khi SVG đã nằm trong DOM (mỗi lần `clean` đổi = mỗi delta stream), đo bằng
  // getBBox rồi tự nắn layout (thu chữ tràn ô, đẩy giãn phần tử chồng nhau, nới ô
  // cha/khung). dangerouslySetInnerHTML dựng lại DOM mỗi lượt → fix luôn áp trên DOM
  // mới, không tích luỹ. useLayoutEffect để nắn TRƯỚC khi trình duyệt vẽ (khỏi nháy).
  useLayoutEffect(() => {
    const svg = hostRef.current?.querySelector("svg");
    if (!svg) return;
    autofixSvg(svg as SVGSVGElement);
    // Còn đang stream → crop chiều cao về phần đã vẽ để ô lớn dần (auto-scroll bám
    // đáy cuộn theo từng hình thay vì nhảy thẳng xuống cuối canvas đầy đủ).
    if (!completeRef.current) cropSvgToContent(svg as SVGSVGElement);
  }, [clean]);

  // Chưa có gì vẽ được → không hiện gì (KHÔNG spinner).
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
