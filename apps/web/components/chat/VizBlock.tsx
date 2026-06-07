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

// Khối ```svg```: render TĂNG DẦN theo từng delta stream (mỗi hình vừa stream xong
// hiện ngay, như gen token) và LUÔN sanitize bằng DOMPurify (loại
// <script>/onload/foreignObject…) chống XSS. Sanitize trong effect (chỉ client) để
// an toàn SSR — DOMPurify cần `window`. KHÔNG hiện spinner/loading.
function VizBlockInner({ code }: Props) {
  const [clean, setClean] = useState<string>("");
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const partial = buildProgressiveSvg(code);
    if (!partial) {
      setClean("");
      return;
    }
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
    if (svg) autofixSvg(svg as SVGSVGElement);
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
