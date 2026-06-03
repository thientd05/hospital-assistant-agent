// Generic panel-control engine: the agent "sees" the panel via a structured
// snapshot (no HTML) and drives it through human-like actions (click/type/...).
// All operations work on the REAL DOM inside the panel root, so clicking a real
// button runs the existing onClick/submit handler — no business logic is
// duplicated here.

const PANEL_ROOT_SELECTOR = "[data-agent-panel-root]";
const ELEMENT_ATTR = "data-agent-ref";

// Delay between steps so the user can watch the agent operate. Giữ NHỎ: trên
// serverless (Vercel Hobby, function 60s) cả lượt agent phải gói trong 60s, nên
// mỗi batch `act` cần chạy nhanh — một batch đặt lịch ~8 bước × 120ms ≈ 1s.
const STEP_DELAY_MS = 200;
const ELEMENT_WAIT_MS = 1500;
// Phần tử đích nằm dưới cùng (lab/chẩn đoán/thuốc) thường khuất khỏi vùng panel
// → cuộn tới rồi CHỜ 1s cho bác sĩ kịp thấy trước khi thao tác (giống cách
// MedicationPicker tự diễn hoạt khi tích thuốc khuất tầm nhìn).
const SCROLL_WAIT_MS = 1000;
// Chờ nút submit hết "busy" (đang gọi REST). 6s đủ cho Atlas; nhỏ hơn 8s cũ để
// không ngốn ngân sách 60s khi mạng chậm.
const BUSY_WAIT_MS = 6000;
const POLL_MS = 50;

export type ElementRole =
  | "tab"
  | "button"
  | "textbox"
  | "combobox"
  | "checkbox"
  | "alert"
  | "text";

export type SnapshotElement = {
  ref: string;
  role: ElementRole | string;
  label: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
};

export type PanelSnapshot = {
  panelOpen: boolean;
  activeTab: string | null;
  tabs: string[];
  elements: SnapshotElement[];
};

export type PanelAction = {
  action: "click" | "type" | "select" | "check";
  ref: string;
  value?: string;
};

export type ActStep = {
  i: number;
  action: PanelAction;
  ok: boolean;
  error?: string;
};

export type ActResult =
  | { ok: true; executed: number; snapshot: PanelSnapshot }
  | {
      ok: false;
      failedAt: number;
      error: string;
      steps: ActStep[];
      snapshot: PanelSnapshot;
    };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(PANEL_ROOT_SELECTOR);
}

function findEl(ref: string): HTMLElement | null {
  const root = getRoot();
  if (!root) return null;
  return root.querySelector<HTMLElement>(`[${ELEMENT_ATTR}="${ref}"]`);
}

// Phần tử có đang nằm trong vùng nhìn thấy của panel không (so với khung panel
// root). Khuất → cần cuộn tới trước khi thao tác.
function isInPanelView(el: HTMLElement): boolean {
  const root = getRoot();
  if (!root) return true;
  const r = el.getBoundingClientRect();
  const c = root.getBoundingClientRect();
  return r.top >= c.top && r.bottom <= c.bottom;
}

// Cuộn phần tử đích vào giữa panel rồi chờ cho bác sĩ kịp thấy. Bỏ qua nếu phần
// tử nằm trong vùng tự-diễn-hoạt (vd modal chọn thuốc tự cuộn lấy) hoặc đã hiện.
async function revealIfHidden(el: HTMLElement): Promise<void> {
  if (el.closest('[data-agent-self-reveal="true"]')) return;
  if (isInPanelView(el)) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(SCROLL_WAIT_MS);
}

export async function waitForRoot(timeout = ELEMENT_WAIT_MS): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (getRoot()) return true;
    await sleep(POLL_MS);
  }
  return Boolean(getRoot());
}

async function waitForEl(
  ref: string,
  timeout = ELEMENT_WAIT_MS
): Promise<HTMLElement> {
  const deadline = Date.now() + timeout;
  let el = findEl(ref);
  while (!el && Date.now() < deadline) {
    await sleep(POLL_MS);
    el = findEl(ref);
  }
  if (!el) {
    throw new Error(
      `Không tìm thấy phần tử "${ref}" trên panel (có thể chưa mở tab/form đúng, hoặc ref sai).`
    );
  }
  return el;
}

async function waitForBusyClear(): Promise<void> {
  const root = getRoot();
  if (!root) return;
  const deadline = Date.now() + BUSY_WAIT_MS;
  while (Date.now() < deadline) {
    if (!root.querySelector('[data-agent-busy="true"]')) return;
    await sleep(POLL_MS);
  }
}

// Chờ tab trong panel nạp xong dữ liệu trước khi chụp snapshot. Trên Vercel/Atlas
// chậm, tab có thể còn "Đang tải…" khi agent đọc → snapshot rỗng/sai. Các tab
// gắn `data-agent-loading="true"` trên khối loading; poll tới khi không còn.
export async function waitForLoadingSettled(
  timeout = BUSY_WAIT_MS
): Promise<void> {
  const root = getRoot();
  if (!root) return;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!root.querySelector('[data-agent-loading="true"]')) return;
    await sleep(POLL_MS);
  }
}

function nativeSetValue(el: HTMLElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else (el as HTMLInputElement).value = value;
}

function inferRole(el: HTMLElement): string {
  if (el instanceof HTMLSelectElement) return "combobox";
  if (el instanceof HTMLTextAreaElement) return "textbox";
  if (el instanceof HTMLInputElement) {
    return el.type === "checkbox" ? "checkbox" : "textbox";
  }
  return "button";
}

function performAction(el: HTMLElement, a: PanelAction): void {
  switch (a.action) {
    case "click": {
      (el as HTMLElement).click();
      return;
    }
    case "type": {
      const value = a.value ?? "";
      el.focus?.();
      nativeSetValue(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    case "select": {
      nativeSetValue(el, a.value ?? "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    case "check": {
      if (!(el instanceof HTMLInputElement)) {
        throw new Error(`Phần tử "${a.ref}" không phải checkbox.`);
      }
      const want = a.value !== "false";
      if (el.checked !== want) el.click();
      return;
    }
    default:
      throw new Error(`Action không hỗ trợ: ${(a as PanelAction).action}`);
  }
}

export function buildSnapshot(): PanelSnapshot {
  const root = getRoot();
  if (!root) {
    return { panelOpen: false, activeTab: null, tabs: [], elements: [] };
  }

  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>(`[${ELEMENT_ATTR}]`)
  );

  const elements: SnapshotElement[] = nodes.map((el) => {
    const ref = el.getAttribute(ELEMENT_ATTR) ?? "";
    const role = el.getAttribute("data-agent-role") ?? inferRole(el);
    const label =
      el.getAttribute("data-agent-label") ??
      (el.textContent ?? "").trim().slice(0, 120);
    const out: SnapshotElement = { ref, role, label };
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        out.checked = el.checked;
      } else {
        out.value = el.value;
      }
      if (el.disabled) out.disabled = true;
    } else if (role === "alert" || role === "text") {
      // "text" = giá trị chỉ-đọc hiển thị ở chế độ Xem (không phải input). Phơi
      // nội dung vào `value` để agent đọc lại được dữ liệu thật, không bịa.
      out.value = (el.textContent ?? "").trim();
    } else if ((el as HTMLButtonElement).disabled) {
      out.disabled = true;
    }
    return out;
  });

  const tabs = elements
    .filter((e) => e.role === "tab")
    .map((e) => e.ref.replace(/^tab:/, ""));
  const activeEl = root.querySelector<HTMLElement>(
    '[data-agent-role="tab"][data-agent-active="true"]'
  );
  const activeTab = activeEl
    ? (activeEl.getAttribute(ELEMENT_ATTR) ?? "").replace(/^tab:/, "")
    : null;

  return { panelOpen: true, activeTab, tabs, elements };
}

export async function runActions(
  actions: PanelAction[],
  delayMs = STEP_DELAY_MS
): Promise<ActResult> {
  const steps: ActStep[] = [];
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    try {
      const el = await waitForEl(a.ref);
      // Khuất khỏi vùng panel → cuộn tới + chờ 1s rồi mới thao tác.
      await revealIfHidden(el);
      performAction(el, a);
      steps.push({ i, action: a, ok: true });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      steps.push({ i, action: a, ok: false, error });
      return { ok: false, failedAt: i, error, steps, snapshot: buildSnapshot() };
    }
    await sleep(delayMs);
    await waitForBusyClear();
  }
  // Sau khi thao tác (có thể đổi tab → reload), chờ data nạp xong rồi mới chụp.
  await waitForLoadingSettled();
  return { ok: true, executed: actions.length, snapshot: buildSnapshot() };
}
