"use client";

import { memo, useEffect, useState } from "react";
import DOMPurify from "dompurify";

type Props = {
  /** Nội dung khối ```svg```, lớn dần theo từng delta stream. */
  code: string;
};

// Dựng một chuỗi SVG HỢP LỆ từ phần đang stream để vẽ TĂNG DẦN (progressive):
// mỗi phần tử con (rect/line/path…) vừa stream xong là render ngay, không đợi cả
// khối. Cách làm: lấy từ thẻ mở <svg ...> hoàn chỉnh; cắt phần thân tới dấu ">"
// hoàn chỉnh CUỐI CÙNG (bỏ tag đang viết dở); tự đóng </svg>. Trả null nếu thẻ mở
// <svg> chưa khép (chưa vẽ được gì).
function buildProgressiveSvg(code: string): string | null {
  const open = /<svg[^>]*>/i.exec(code);
  if (!open) return null;
  let body = code.slice(open.index + open[0].length);
  const closeIdx = body.search(/<\/svg\s*>/i);
  if (closeIdx !== -1) {
    body = body.slice(0, closeIdx); // đã có </svg> → lấy trọn thân
  } else {
    const lastGt = body.lastIndexOf(">"); // chưa khép → cắt tới tag hoàn chỉnh cuối
    body = lastGt === -1 ? "" : body.slice(0, lastGt + 1);
  }
  // <g>/<defs>… chưa đóng sẽ được trình duyệt + DOMPurify tự đóng khi parse.
  return `${open[0]}${body}</svg>`;
}

// Khối ```svg```: render TĂNG DẦN theo từng delta stream (mỗi hình vừa stream xong
// hiện ngay, như gen token) và LUÔN sanitize bằng DOMPurify (loại
// <script>/onload/foreignObject…) chống XSS. Sanitize trong effect (chỉ client) để
// an toàn SSR — DOMPurify cần `window`. KHÔNG hiện spinner/loading.
function VizBlockInner({ code }: Props) {
  const [clean, setClean] = useState<string>("");
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

  // Chưa có gì vẽ được → không hiện gì (KHÔNG spinner).
  if (!clean) return null;
  return (
    <div className="viz-block" dangerouslySetInnerHTML={{ __html: clean }} />
  );
}

export const VizBlock = memo(VizBlockInner);
