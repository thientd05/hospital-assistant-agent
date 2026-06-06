"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** Nội dung khối ```html```, lớn dần theo từng delta stream. */
  code: string;
};

// Khối HTML đã "đủ" để render? Tránh mount iframe khi còn đang stream dở (remount
// mỗi token gây nhấp nháy + chạy lại JS). Coi là xong khi có thẻ đóng cuối hoặc
// fence đã khép (parent truyền code đã trim).
function isComplete(code: string): boolean {
  return /<\/html\s*>|<\/body\s*>/i.test(code);
}

// Script chèn vào iframe để tự báo chiều cao thật về parent (qua postMessage).
// allow-scripts cho phép chạy; KHÔNG allow-same-origin nên origin mờ, không đọc
// được gì của app cha.
function wrap(html: string, channel: string): string {
  const resizer = `<script>(function(){function h(){try{parent.postMessage({__ch:${JSON.stringify(
    channel
  )},height:document.documentElement.scrollHeight},"*")}catch(e){}}new ResizeObserver(h).observe(document.documentElement);window.addEventListener("load",h);setTimeout(h,50);setTimeout(h,400)})();<\/script>`;
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${resizer}</body>`);
  }
  return html + resizer;
}

// Dashboard/báo cáo HTML do agent sinh — render trong <iframe sandbox> CÔ LẬP.
// Bảo mật: chỉ "allow-scripts" (KHÔNG "allow-same-origin") → iframe không đọc được
// DOM/cookie/localStorage/token của app cha; JS chạy nhưng bị nhốt. Không sanitize
// (cô lập là ranh giới an toàn). Render khi khối hoàn chỉnh, KHÔNG spinner.
function HtmlArtifactInner({ code }: Props) {
  const channel = useMemo(
    () => `html-artifact-${Math.random().toString(36).slice(2)}`,
    []
  );
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);
  const ready = isComplete(code);
  const srcDoc = useMemo(
    () => (ready ? wrap(code, channel) : ""),
    [ready, code, channel]
  );

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (d && d.__ch === channel && typeof d.height === "number") {
        setHeight(Math.min(2000, Math.max(80, Math.ceil(d.height) + 4)));
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [channel]);

  // Chưa hoàn chỉnh → dòng chữ nhẹ (KHÔNG vòng quay).
  if (!ready) {
    return <div className="html-artifact-loading">đang dựng bảng…</div>;
  }
  return (
    <div className="html-artifact">
      <iframe
        ref={ref}
        title="dashboard"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        style={{ width: "100%", height, border: "0", display: "block" }}
      />
    </div>
  );
}

export const HtmlArtifact = memo(HtmlArtifactInner);
