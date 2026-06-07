"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** Nội dung khối ```html```, lớn dần theo từng delta stream. */
  code: string;
};

// Số ký tự lộ thêm mỗi frame (~60fps → ~3000 ký tự/giây). Hằng số (KHÔNG tỉ lệ với
// gap) để một delta dài tới cùng lúc cũng vẽ ĐỀU TAY từ trên xuống, không nhảy cả
// cục. Bị chặn trần bởi độ dài đã stream nên stream chậm thì lộ bám theo stream.
const REVEAL_STEP = 50;

// Khối HTML đã "đủ" để chạy JS? Trong lúc lộ dần ta render HTML/CSS mà KHÔNG chạy
// script; chỉ khi khối hoàn chỉnh + đã lộ hết mới phát `done` để chạy script một lần.
function isComplete(code: string): boolean {
  return /<\/html\s*>|<\/body\s*>/i.test(code);
}

// Dựng phiên bản HTML hợp lệ TỐI ĐA từ một prefix đang lộ dở, để render được càng
// sớm càng tốt. Vấn đề cốt lõi: `<style>`/`<script>` là "raw text" — nếu CHƯA có
// thẻ đóng, trình duyệt nuốt TOÀN BỘ phần sau làm text → không vẽ gì. Xử lý:
//   - <style> hở → đóng tạm tới rule `}` hoàn chỉnh cuối (CSS áp dụng dần);
//   - <script> hở → cắt bỏ (không chạy lúc lộ; để hở sẽ nuốt phần sau);
//   - <!-- comment hở → cắt bỏ.
// Thẻ thường viết dở ở cuối (`<div clas`) trình duyệt tự bỏ; text đang lộ (`Tổng qu`)
// vẫn hiện → không cần cắt tới `>` cuối.
function progressiveHtml(code: string): string {
  let s = code;
  const lower = () => s.toLowerCase();
  const sOpen = lower().lastIndexOf("<script");
  if (sOpen !== -1 && lower().indexOf("</script>", sOpen) === -1) {
    s = s.slice(0, sOpen);
  }
  const cOpen = s.lastIndexOf("<!--");
  if (cOpen !== -1 && s.indexOf("-->", cOpen) === -1) {
    s = s.slice(0, cOpen);
  }
  const stOpen = lower().lastIndexOf("<style");
  if (stOpen !== -1 && lower().indexOf("</style>", stOpen) === -1) {
    const gt = s.indexOf(">", stOpen);
    if (gt !== -1) {
      const lastBrace = s.lastIndexOf("}");
      s =
        lastBrace > gt
          ? s.slice(0, lastBrace + 1) + "</style>"
          : s.slice(0, gt + 1) + "</style>";
    }
  }
  return s;
}

// Shell CỐ ĐỊNH nạp vào iframe MỘT lần (không phụ thuộc `code` → iframe không bao
// giờ remount). Bootstrap chạy trong origin mờ (sandbox allow-scripts, KHÔNG
// same-origin → không đọc được DOM/cookie/token app cha):
//   - nhận {html} → set #root.innerHTML (HTML/CSS hiện; <script> trơ vì innerHTML
//     không execute → an toàn lúc lộ);
//   - nhận {done} → tạo lại mọi <script> bằng createElement để JS chạy ĐÚNG MỘT lần;
//   - ResizeObserver báo chiều cao thật về cha qua postMessage.
// Không sanitize — cô lập iframe là ranh giới an toàn.
function buildShell(channel: string): string {
  const ch = JSON.stringify(channel);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style></head><body><div id="root"></div><script>(function(){
var CH=${ch};
var root=document.getElementById('root');
function reportHeight(){try{var b=document.body;var h=b?b.scrollHeight:document.documentElement.scrollHeight;parent.postMessage({__ch:CH,height:h},'*')}catch(e){}}
function runScripts(){
  var olds=root.querySelectorAll('script');
  for(var i=0;i<olds.length;i++){
    var o=olds[i];var s=document.createElement('script');
    for(var j=0;j<o.attributes.length;j++){var a=o.attributes[j];s.setAttribute(a.name,a.value)}
    s.text=o.textContent;o.parentNode.replaceChild(s,o);
  }
  reportHeight();setTimeout(reportHeight,50);setTimeout(reportHeight,400);
}
window.addEventListener('message',function(e){
  var d=e.data;if(!d||d.__ch!==CH)return;
  if(typeof d.html==='string'){root.innerHTML=d.html;reportHeight();}
  if(d.done){runScripts();}
});
try{new ResizeObserver(reportHeight).observe(document.documentElement)}catch(e){}
})();<\/script></body></html>`;
}

// Dashboard/báo cáo HTML do agent sinh — VẼ DẦN (realtime) trong <iframe sandbox>
// CÔ LẬP, JS chạy MỘT lần ở cuối.
//
// Vì sao "lộ dần" bằng requestAnimationFrame thay vì gửi thẳng `code`: iframe nhận
// nội dung qua postMessage (bất đồng bộ) và chỉ sẵn sàng sau onLoad. Nếu cứ gửi
// `code` thô, mọi delta tới TRƯỚC khi iframe ready bị gộp thành một cú đổ cả khối
// ("bụp"). Tách hiệu ứng vẽ khỏi nhịp delta: giữ con trỏ `revealed` tăng mượt mỗi
// frame về phía độ dài `code` hiện có (ease-out, trần = độ dài đã stream) → dù
// nguồn về cả cục vẫn vẽ ra từ từ; iframe.onLoad làm tín hiệu sẵn sàng (không race
// như postMessage). Mỗi frame gửi progressiveHtml(prefix) để render hợp lệ tối đa.
function HtmlArtifactInner({ code }: Props) {
  const channel = useMemo(
    () => `html-artifact-${Math.random().toString(36).slice(2)}`,
    []
  );
  const shell = useMemo(() => buildShell(channel), [channel]);
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(60);

  const fullRef = useRef("");
  const revealedRef = useRef(0);
  const lastLenRef = useRef(-1);
  const readyRef = useRef(false);
  const doneSentRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  function post(html: string, done: boolean) {
    ref.current?.contentWindow?.postMessage(
      { __ch: channel, html, done },
      "*"
    );
  }

  function tick() {
    rafRef.current = null;
    if (!readyRef.current) {
      schedule();
      return;
    }
    const full = fullRef.current;
    const target = full.length;
    if (revealedRef.current < target) {
      revealedRef.current = Math.min(target, revealedRef.current + REVEAL_STEP);
    }
    const len = Math.floor(revealedRef.current);
    if (len !== lastLenRef.current) {
      lastLenRef.current = len;
      post(progressiveHtml(full.slice(0, len)), false);
    }
    // Lộ hết + khối hoàn chỉnh → gửi nguyên văn (giữ <script>) + done để chạy JS.
    if (isComplete(full) && revealedRef.current >= target) {
      if (!doneSentRef.current) {
        doneSentRef.current = true;
        post(full, true);
      }
      return; // dừng vòng lặp
    }
    schedule();
  }

  function schedule() {
    if (rafRef.current == null && !doneSentRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  // Mỗi lần `code` lớn lên: cập nhật mục tiêu + đảm bảo vòng lặp đang chạy.
  useEffect(() => {
    fullRef.current = code;
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Nhận chiều cao thật từ iframe (auto-height).
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || d.__ch !== channel) return;
      if (typeof d.height === "number") {
        // KHÔNG cộng pad: shell đo body.scrollHeight (chiều cao nội dung thật, không
        // phình theo viewport). Cộng thêm sẽ tạo vòng lặp tự tăng (resize → observer
        // → báo lớn hơn → resize…) làm nền dài vô hạn tới trần.
        setHeight(Math.min(6000, Math.max(60, Math.ceil(d.height))));
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [channel]);

  // Dọn rAF khi unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="html-artifact">
      <iframe
        ref={ref}
        title="dashboard"
        sandbox="allow-scripts"
        srcDoc={shell}
        onLoad={() => {
          readyRef.current = true;
          lastLenRef.current = -1; // ép gửi lại từ đầu
          schedule();
        }}
        style={{ width: "100%", height, border: "0", display: "block" }}
      />
    </div>
  );
}

export const HtmlArtifact = memo(HtmlArtifactInner);
