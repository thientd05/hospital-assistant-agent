"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** Nội dung khối ```html```, lớn dần theo từng delta stream. */
  code: string;
};

// Khối HTML đã "đủ" để chạy JS? Trong lúc stream ta render HTML/CSS dần (không chạy
// script); chỉ khi khối hoàn chỉnh mới phát tín hiệu `done` để chạy script một lần.
function isComplete(code: string): boolean {
  return /<\/html\s*>|<\/body\s*>/i.test(code);
}

// Dựng phiên bản HTML hợp lệ TỐI ĐA từ chuỗi đang stream dở, để render được càng
// sớm càng tốt (box/nút rỗng, rồi chữ điền vào…). Vấn đề cốt lõi: `<style>` và
// `<script>` là "raw text" — nếu CHƯA có thẻ đóng, trình duyệt nuốt TOÀN BỘ phần
// sau làm text → không vẽ gì cho tới hết khối. Cách xử lý mỗi delta:
//   - <style> đang hở → đóng tạm tới rule `}` hoàn chỉnh cuối (CSS áp dụng dần,
//     phần body phía sau render ngay);
//   - <script> đang hở → cắt bỏ (không chạy lúc stream; để hở sẽ nuốt phần sau);
//   - <!-- comment đang hở → cắt bỏ.
// Thẻ thường viết dở ở cuối (vd `<div clas`) trình duyệt tự bỏ khi parse innerHTML,
// còn text node đang stream (vd "Tổng qu") vẫn hiện → không cần cắt tới `>` cuối.
// Khi khối hoàn chỉnh, mọi thẻ đã đóng nên hàm trả nguyên văn (script được giữ để
// chạy ở `done`).
function progressiveHtml(code: string): string {
  let s = code;
  const lower = () => s.toLowerCase();
  // 1. <script> đang hở → cắt từ thẻ mở tới hết.
  const sOpen = lower().lastIndexOf("<script");
  if (sOpen !== -1 && lower().indexOf("</script>", sOpen) === -1) {
    s = s.slice(0, sOpen);
  }
  // 2. <!-- comment đang hở → cắt.
  const cOpen = s.lastIndexOf("<!--");
  if (cOpen !== -1 && s.indexOf("-->", cOpen) === -1) {
    s = s.slice(0, cOpen);
  }
  // 3. <style> đang hở → đóng tạm tới rule hoàn chỉnh `}` cuối.
  const stOpen = lower().lastIndexOf("<style");
  if (stOpen !== -1 && lower().indexOf("</style>", stOpen) === -1) {
    const gt = s.indexOf(">", stOpen); // hết thẻ mở <style ...>
    if (gt !== -1) {
      const lastBrace = s.lastIndexOf("}");
      s =
        lastBrace > gt
          ? s.slice(0, lastBrace + 1) + "</style>"
          : s.slice(0, gt + 1) + "</style>";
    }
    // gt === -1: thẻ <style mở còn dở → để parser tự bỏ.
  }
  return s;
}

// Shell CỐ ĐỊNH nạp vào iframe MỘT lần (không phụ thuộc `code` → iframe không bao
// giờ remount, hết nhấp nháy). Bootstrap script chạy trong origin mờ của iframe
// (sandbox allow-scripts, KHÔNG same-origin) và:
//   - nhận {html} mỗi delta → set #root.innerHTML (HTML/CSS hiện dần; <script> trơ
//     vì innerHTML không execute → an toàn lúc stream);
//   - nhận {done} → tạo lại mọi <script> bằng createElement để JS chạy ĐÚNG MỘT
//     lần với DOM đã đầy đủ;
//   - ResizeObserver báo chiều cao thật về cha qua postMessage;
//   - postMessage {ready} để cha flush payload mới nhất (tránh mất delta đầu).
// allow-scripts (KHÔNG allow-same-origin) → iframe không đọc được DOM/cookie/token
// app cha. Không sanitize — cô lập là ranh giới an toàn.
function buildShell(channel: string): string {
  const ch = JSON.stringify(channel);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style></head><body><div id="root"></div><script>(function(){
var CH=${ch};
var root=document.getElementById('root');
function reportHeight(){try{parent.postMessage({__ch:CH,height:document.documentElement.scrollHeight},'*')}catch(e){}}
function runScripts(){
  var olds=root.querySelectorAll('script');
  for(var i=0;i<olds.length;i++){
    var o=olds[i];var s=document.createElement('script');
    for(var j=0;j<o.attributes.length;j++){var a=o.attributes[j];s.setAttribute(a.name,a.value)}
    s.text=o.textContent;
    o.parentNode.replaceChild(s,o);
  }
  reportHeight();setTimeout(reportHeight,50);setTimeout(reportHeight,400);
}
window.addEventListener('message',function(e){
  var d=e.data;if(!d||d.__ch!==CH)return;
  if(typeof d.html==='string'){root.innerHTML=d.html;reportHeight();}
  if(d.done){runScripts();}
});
try{new ResizeObserver(reportHeight).observe(document.documentElement)}catch(e){}
window.addEventListener('load',reportHeight);
parent.postMessage({__ch:CH,ready:true},'*');
})();<\/script></body></html>`;
}

// Dashboard/báo cáo HTML do agent sinh — render TĂNG DẦN (realtime) trong <iframe
// sandbox> CÔ LẬP, JS chạy MỘT lần ở cuối. Xem buildShell cho cơ chế + bảo mật.
function HtmlArtifactInner({ code }: Props) {
  const channel = useMemo(
    () => `html-artifact-${Math.random().toString(36).slice(2)}`,
    []
  );
  const shell = useMemo(() => buildShell(channel), [channel]);
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(60);

  // Payload mới nhất + cờ ready/doneSent giữ qua re-render mà không gây render lại.
  const readyRef = useRef(false);
  const doneSentRef = useRef(false);
  const latestRef = useRef<{ html: string; done: boolean }>({
    html: "",
    done: false,
  });

  // Gửi payload mới nhất xuống iframe (chỉ khi đã ready). `done` chỉ gửi một lần.
  function flush() {
    if (!readyRef.current) return;
    const win = ref.current?.contentWindow;
    if (!win) return;
    const { html, done } = latestRef.current;
    const sendDone = done && !doneSentRef.current;
    win.postMessage({ __ch: channel, html, done: sendDone }, "*");
    if (sendDone) doneSentRef.current = true;
  }

  // Nhận chiều cao + handshake ready từ iframe.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || d.__ch !== channel) return;
      if (d.ready) {
        readyRef.current = true;
        flush(); // flush payload đã tích luỹ trước khi bootstrap kịp chạy
      }
      if (typeof d.height === "number") {
        setHeight(Math.min(2000, Math.max(60, Math.ceil(d.height) + 4)));
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // flush dùng ref nên không cần dep; channel ổn định.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // Mỗi lần `code` lớn lên: cập nhật payload + gửi xuống iframe (nếu ready).
  useEffect(() => {
    const done = isComplete(code);
    // Khối xong → gửi nguyên văn (giữ <script> để chạy ở done); đang stream → gửi
    // bản hợp lệ tối đa để render sớm nhất.
    latestRef.current = { html: done ? code : progressiveHtml(code), done };
    flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="html-artifact">
      <iframe
        ref={ref}
        title="dashboard"
        sandbox="allow-scripts"
        srcDoc={shell}
        style={{ width: "100%", height, border: "0", display: "block" }}
      />
    </div>
  );
}

export const HtmlArtifact = memo(HtmlArtifactInner);
