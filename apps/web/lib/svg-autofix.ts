// Auto-fix layout cho SVG agent TỰ VẼ (dùng trong VizBlock). Agent đặt toạ độ x/y
// bằng tay nên hay dính 3 lỗi: (A) chữ tràn ra ngoài ô, (B) các phần tử chồng lấn
// nhau, (C) phần tử con tràn khỏi phần tử cha / tràn khung. Sau khi SVG đã nằm
// trong DOM, ta ĐO thật bằng getBBox rồi sửa TẠI CHỖ theo hướng KHÔNG phá thêm:
//   - chữ chỉ THU NHỎ (không phóng to),
//   - ô/khung chỉ NỚI RỘNG (không thu nhỏ),
//   - dòng/ô chồng nhau bị ĐẨY GIÃN xuống.
// → SVG vốn đã đẹp = mọi pass đều no-op (chỉ chạm khi phát hiện vi phạm rõ ràng).
// Toàn bộ bọc try/catch: đo lỗi thì bỏ qua, thà không sửa còn hơn làm vỡ hình.

type Box = { x: number; y: number; w: number; h: number };
type Group = { members: SVGGraphicsElement[]; box: Box };

const PAD = 4; // lề chữ bên trong ô
const GAP = 6; // khoảng hở tối thiểu giữa hai phần tử chồng nhau
const MARGIN = 8; // lề quanh khung khi nới viewBox
const MIN_FONT = 9; // cỡ chữ nhỏ nhất khi thu để vừa ô

const right = (b: Box) => b.x + b.w;
const bottom = (b: Box) => b.y + b.h;
const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;
const area = (b: Box) => b.w * b.h;
// chồng ngang thực sự (>1px) — hai ô cạnh nhau theo cột khác nhau sẽ KHÔNG bị coi là chồng
const hOverlap = (a: Box, b: Box) =>
  Math.min(right(a), right(b)) - Math.max(a.x, b.x) > 1;
const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(right(a), right(b)) - x, h: Math.max(bottom(a), bottom(b)) - y };
};

function bbox(el: SVGGraphicsElement): Box | null {
  try {
    const b = el.getBBox();
    if (!isFinite(b.x) || !isFinite(b.width) || b.width <= 0 || b.height <= 0) return null;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  } catch {
    return null;
  }
}

// Cỡ chữ hiện tại: lấy font-size gần nhất trên cây cha, mặc định 15 (chuẩn boot).
function curFont(el: Element): number {
  let n: Element | null = el;
  while (n) {
    const f = n.getAttribute?.("font-size");
    if (f) {
      const v = parseFloat(f);
      if (!isNaN(v)) return v;
    }
    n = n.parentElement;
  }
  return 15;
}

// Dịch một phần tử xuống dy (theo trục y). rect/text có thuộc tính y → đổi thẳng
// (getBBox lượt sau phản ánh ngay); tspan con cũng dịch theo nếu đặt y tuyệt đối.
function shiftY(el: Element, dy: number) {
  const cur = parseFloat(el.getAttribute("y") ?? "NaN");
  if (!isNaN(cur)) el.setAttribute("y", String(cur + dy));
  el.querySelectorAll("tspan[y]").forEach((ts) => {
    const ty = parseFloat(ts.getAttribute("y") ?? "NaN");
    if (!isNaN(ty)) ts.setAttribute("y", String(ty + dy));
  });
}

// Gom phần tử thành NHÓM RẮN để đẩy giãn mà không tách chữ khỏi ô của nó:
// mỗi ô-lá (rect không bao rect khác) + các text có tâm nằm trong ô = một nhóm;
// text không thuộc ô-lá nào → nhóm đơn. Ô-bao (chứa rect khác) KHÔNG vào nhóm
// (không bị dịch — sẽ được nới rộng ở pass C để ôm trọn con đã dịch).
function buildGroups(rects: { el: SVGGraphicsElement; box: Box }[], texts: { el: SVGGraphicsElement; box: Box }[]): Group[] {
  // o nằm gọn trong r (và nhỏ hơn) → r là ô-bao, không phải ô-lá
  const containedIn = (inner: Box, outer: Box) =>
    inner !== outer &&
    inner.x >= outer.x - 1 && inner.y >= outer.y - 1 &&
    right(inner) <= right(outer) + 1 && bottom(inner) <= bottom(outer) + 1 &&
    area(inner) < area(outer) - 1;
  const isLeaf = (r: { box: Box }) => !rects.some((o) => containedIn(o.box, r.box));

  const leaves = rects.filter((r) => isLeaf(r));
  const groups: Group[] = leaves.map((r) => ({ members: [r.el], box: r.box }));
  const used = new Set<SVGGraphicsElement>();

  for (const t of texts) {
    // ô-lá nhỏ nhất chứa tâm chữ
    let host: Group | null = null;
    let hostArea = Infinity;
    for (let i = 0; i < leaves.length; i++) {
      const rb = leaves[i].box;
      if (cx(t.box) >= rb.x && cx(t.box) <= right(rb) && cy(t.box) >= rb.y && cy(t.box) <= bottom(rb)) {
        if (area(rb) < hostArea) {
          hostArea = area(rb);
          host = groups[i];
        }
      }
    }
    if (host) {
      host.members.push(t.el);
      host.box = union(host.box, t.box);
      used.add(t.el);
    }
  }
  for (const t of texts) {
    if (!used.has(t.el)) groups.push({ members: [t.el], box: t.box });
  }
  return groups;
}

// Đẩy giãn các nhóm chồng dọc nhau (sweep từ trên xuống, theo cột nhờ hOverlap).
function deOverlap(groups: Group[]) {
  groups.sort((a, b) => a.box.y - b.box.y);
  const placed: Group[] = [];
  for (const g of groups) {
    let need = g.box.y;
    for (const p of placed) {
      if (hOverlap(p.box, g.box) && bottom(p.box) + GAP > need) need = bottom(p.box) + GAP;
    }
    const dy = need - g.box.y;
    if (dy > 0.5) {
      for (const m of g.members) shiftY(m, dy);
      g.box.y += dy;
    }
    placed.push(g);
  }
}

export function autofixSvg(svg: SVGSVGElement): void {
  try {
    const rectEls = Array.from(svg.querySelectorAll("rect")) as SVGGraphicsElement[];
    const textEls = Array.from(svg.querySelectorAll("text")) as SVGGraphicsElement[];

    // === Pass A: thu nhỏ chữ tràn ô (gắn chữ vào rect nhỏ nhất chứa tâm nó) ===
    for (const t of textEls) {
      const tb = bbox(t);
      if (!tb) continue;
      let host: Box | null = null;
      let hostArea = Infinity;
      for (const r of rectEls) {
        const rb = bbox(r);
        if (!rb) continue;
        if (cx(tb) >= rb.x && cx(tb) <= right(rb) && cy(tb) >= rb.y && cy(tb) <= bottom(rb) && area(rb) < hostArea) {
          hostArea = area(rb);
          host = rb;
        }
      }
      if (!host) continue;
      const maxW = host.w - 2 * PAD;
      if (maxW > 0 && tb.w > maxW) {
        const cur = curFont(t);
        const next = Math.max(MIN_FONT, Math.floor((cur * maxW) / tb.w));
        if (next < cur) t.setAttribute("font-size", String(next));
      }
    }

    // === Pass B: đẩy giãn các nhóm (ô-lá + chữ) chồng dọc nhau ===
    const rectsM = rectEls.map((el) => ({ el, box: bbox(el) })).filter((r): r is { el: SVGGraphicsElement; box: Box } => !!r.box);
    const textsM = textEls.map((el) => ({ el, box: bbox(el) })).filter((t): t is { el: SVGGraphicsElement; box: Box } => !!t.box);
    deOverlap(buildGroups(rectsM, textsM));

    // === Pass C: nới rộng mỗi ô để ôm trọn con (rect/chữ đã dịch). Xử lý ô NHỎ
    // trước (sort theo diện tích tăng) để khi nới ô-bao thì con đã ở vị trí cuối. ===
    const sorted = [...rectEls]
      .map((el) => ({ el, box: bbox(el) }))
      .filter((r): r is { el: SVGGraphicsElement; box: Box } => !!r.box)
      .sort((a, b) => area(a.box) - area(b.box));
    const kids = [...rectEls, ...textEls];
    for (const { el, box: rb } of sorted) {
      let maxR = right(rb);
      let maxB = bottom(rb);
      for (const k of kids) {
        if (k === el) continue;
        const kb = bbox(k);
        if (!kb) continue;
        // con = phần tử có tâm-x trong ô và mép TRÊN bắt đầu bên trong ô (dù mép
        // dưới/phải có thể tràn) → nới ô để ôm trọn phần tràn.
        if (cx(kb) > rb.x && cx(kb) < right(rb) && kb.y >= rb.y - 2 && kb.y < bottom(rb) + 2) {
          maxR = Math.max(maxR, right(kb) + PAD);
          maxB = Math.max(maxB, bottom(kb) + PAD);
        }
      }
      const w = parseFloat(el.getAttribute("width") ?? "NaN");
      const h = parseFloat(el.getAttribute("height") ?? "NaN");
      if (!isNaN(w) && maxR - rb.x > w + 0.5) el.setAttribute("width", String(maxR - rb.x));
      if (!isNaN(h) && maxB - rb.y > h + 0.5) el.setAttribute("height", String(maxB - rb.y));
    }

    // === Pass D: nới viewBox + width/height để không bị cắt mép (chỉ giãn) ===
    let uni: Box | null = null;
    for (const el of [...rectEls, ...textEls]) {
      const b = bbox(el);
      if (b) uni = uni ? union(uni, b) : b;
    }
    const vbAttr = svg.getAttribute("viewBox");
    if (uni && vbAttr) {
      const p = vbAttr.trim().split(/[\s,]+/).map(Number);
      if (p.length === 4 && p.every((n) => isFinite(n))) {
        const [vx, vy, vw, vh] = p;
        const nx = Math.min(vx, uni.x - MARGIN);
        const ny = Math.min(vy, uni.y - MARGIN);
        const nr = Math.max(vx + vw, right(uni) + MARGIN);
        const nb = Math.max(vy + vh, bottom(uni) + MARGIN);
        const nw = nr - nx;
        const nh = nb - ny;
        if (nx < vx - 0.5 || ny < vy - 0.5 || nw > vw + 0.5 || nh > vh + 0.5) {
          svg.setAttribute("viewBox", `${nx} ${ny} ${nw} ${nh}`);
          if (svg.getAttribute("width")) svg.setAttribute("width", String(nw));
          if (svg.getAttribute("height")) svg.setAttribute("height", String(nh));
        }
      }
    }
  } catch {
    /* đo đạc lỗi → bỏ qua, giữ nguyên SVG */
  }
}
