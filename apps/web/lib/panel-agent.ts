// Generic panel-control engine: the agent "sees" the panel via a structured
// snapshot (no HTML) and drives it through human-like actions (click/type/...).
// All operations work on the REAL DOM inside the panel root, so clicking a real
// button runs the existing onClick/submit handler — no business logic is
// duplicated here.

const PANEL_ROOT_SELECTOR = "[data-agent-panel-root]";
const ELEMENT_ATTR = "data-agent-ref";

// Delay between steps so the doctor can watch the agent operate.
const STEP_DELAY_MS = 200;
const ELEMENT_WAIT_MS = 1500;
const BUSY_WAIT_MS = 8000;
const POLL_MS = 50;

export type ElementRole =
  | "tab"
  | "button"
  | "textbox"
  | "combobox"
  | "checkbox"
  | "alert";

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
    } else if (role === "alert") {
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
  return { ok: true, executed: actions.length, snapshot: buildSnapshot() };
}
