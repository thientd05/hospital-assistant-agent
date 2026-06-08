"use client";

import { memo, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { autofixSvg } from "@/lib/svg-autofix";

type Props = {
  /** Nội dung khối ```svg```, lớn dần theo từng delta stream. */
  code: string;
};

const SANI = { USE_PROFILES: { svg: true, svgFilters: true } } as const;

// Thêm width/height = kích thước viewBox nếu thẻ <svg> thiếu, để SVG render ĐÚNG
// kích thước gốc (scale 1) thay vì bị kéo giãn đầy bề ngang khung chat. CSS
// `max-width:100%` vẫn cho thu nhỏ trên màn hẹp.
function normalizeSvgTag(tag: string): string {
  if (/\bwidth\s*=/.test(tag)) return tag;
  const vb =
    /viewBox\s*=\s*["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/i.exec(tag);
  if (!vb) return tag;
  return tag.replace(/<svg/i, `<svg width="${vb[1]}" height="${vb[2]}"`);
}

// Quét body, trả độ dài phần CHỈ gồm các phần tử top-level đã ĐÓNG hoàn chỉnh (depth
// về 0). Nhờ vậy ta chỉ append phần tử khi nó xong trọn vẹn — không append nửa chừng
// rồi phải sửa (gây nhảy). Bỏ qua comment. Tự đóng `<rect/>` không tăng depth.
function completeTopLevelLen(body: string): number {
  let i = 0;
  let depth = 0;
  let last = 0;
  const n = body.length;
  while (i < n) {
    const lt = body.indexOf("<", i);
    if (lt === -1) break;
    if (body.startsWith("<!--", lt)) {
      const end = body.indexOf("-->", lt + 4);
      if (end === -1) break;
      i = end + 3;
      if (depth === 0) last = i;
      continue;
    }
    const gt = body.indexOf(">", lt);
    if (gt === -1) break; // tag chưa đóng
    const tag = body.slice(lt, gt + 1);
    if (tag.startsWith("</")) {
      if (depth > 0) depth--;
      if (depth === 0) last = gt + 1;
    } else if (/\/>\s*$/.test(tag)) {
      if (depth === 0) last = gt + 1; // tự đóng
    } else {
      depth++;
    }
    i = gt + 1;
  }
  return last;
}

// Crop viewBox + height xuống đáy nội dung đã vẽ để ô lớn dần TỪ TRÊN (auto-scroll
// cuộn theo) thay vì cao bằng canvas đầy đủ ngay. Chiều cao CHỈ TĂNG (maxBottomRef)
// để không co lại lúc đo dao động → đỡ rung.
function cropHeight(svg: SVGSVGElement, maxBottomRef: { current: number }): void {
  try {
    const vb = svg.getAttribute("viewBox");
    if (!vb) return;
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length !== 4 || !p.every((x) => isFinite(x))) return;
    const [vx, vy, vw] = p;
    const c = svg.getBBox();
    if (!c || !isFinite(c.y) || !isFinite(c.height) || c.height <= 0) return;
    const bottom = Math.max(maxBottomRef.current, c.y + c.height);
    maxBottomRef.current = bottom;
    const nh = bottom - vy + 8;
    if (nh <= 0) return;
    svg.setAttribute("viewBox", `${vx} ${vy} ${vw} ${nh}`);
    if (svg.getAttribute("height")) svg.setAttribute("height", String(nh));
  } catch {
    /* đo lỗi → giữ nguyên */
  }
}

function parseSvg(str: string): SVGSVGElement | null {
  const clean = DOMPurify.sanitize(str, SANI);
  const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
  const svg = doc.querySelector("svg");
  return svg ? (document.importNode(svg, true) as SVGSVGElement) : null;
}

// Khối ```svg```: render TĂNG DẦN mà KHÔNG dựng lại DOM mỗi delta. Giữ một <svg> gốc
// cố định, mỗi phần tử top-level vừa stream xong (đóng trọn) thì APPEND vào — phần tử
// cũ không bị huỷ/vẽ lại nên không giật; phần tử mới fade-in nhẹ (class .viz-appear)
// vào đúng vị trí của nó. Luôn sanitize (DOMPurify, chống XSS). Crop chiều cao cho
// cuộn mượt. CHỈ KHI gen xong (</svg>) mới autofixSvg MỘT lần để căn chỉnh toàn bộ.
// Cập nhật gộp theo animation frame (nhiều token/frame chỉ xử lý 1 lần).
function VizBlockInner({ code }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<SVGSVGElement | null>(null);
  const appendedRef = useRef(0); // số phần tử top-level đã append
  const lastLenRef = useRef(-1); // độ dài usable lần trước (bỏ qua nếu chưa đổi)
  const maxBottomRef = useRef(0);
  const doneRef = useRef(false);
  const latestRef = useRef(code);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    latestRef.current = code;
    if (rafRef.current != null) return; // frame đang chờ sẽ đọc code mới nhất
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      sync(latestRef.current);
    });
  }, [code]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  function sync(c: string) {
    const host = hostRef.current;
    if (!host || doneRef.current) return;
    const open = /<svg[^>]*>/i.exec(c);
    if (!open) return;
    const openTag = normalizeSvgTag(open[0]);

    // Tạo <svg> gốc một lần.
    if (!rootRef.current) {
      const root = parseSvg(`${openTag}</svg>`);
      if (!root) return;
      host.appendChild(root);
      rootRef.current = root;
    }
    const root = rootRef.current;

    const body = c.slice(open.index + open[0].length);
    const closeIdx = body.search(/<\/svg\s*>/i);
    const complete = closeIdx !== -1;
    const usable = complete
      ? body.slice(0, closeIdx)
      : body.slice(0, completeTopLevelLen(body));

    if (usable && usable.length !== lastLenRef.current) {
      lastLenRef.current = usable.length;
      const parsed = parseSvg(`${openTag}${usable}</svg>`);
      if (parsed) {
        const kids = parsed.children;
        const before = appendedRef.current;
        for (let k = before; k < kids.length; k++) {
          const node = document.importNode(kids[k], true) as SVGElement;
          node.classList?.add("viz-appear"); // fade-in nhẹ vào đúng vị trí
          root.appendChild(node);
        }
        appendedRef.current = kids.length;
        if (kids.length > before) cropHeight(root, maxBottomRef);
      }
    }

    if (complete) {
      doneRef.current = true;
      autofixSvg(root); // căn chỉnh toàn bộ MỘT lần khi đã xong
    }
  }

  return <div ref={hostRef} className="viz-block" />;
}

export const VizBlock = memo(VizBlockInner);
