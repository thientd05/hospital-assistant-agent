import type {
  HookConfig,
  HookContext,
  HookHandler,
  HookTiming,
} from "./types.ts";

// ── Đăng ký hook (import TĨNH — esbuild inline cả handler lẫn config.json vào
// bundle, không cần cp lên Vercel) ──────────────────────────────────────────
// Thêm hook mới: tạo thư mục `<tên>/` (config.json + handler.ts) rồi thêm 2 dòng
// import + 1 entry vào HOOKS dưới đây. (node --watch KHÔNG pickup file mới →
// restart agent dev.)
import currentDatetimeHandler from "./current-datetime/handler.ts";
import currentDatetimeConfig from "./current-datetime/config.json" with { type: "json" };

type LoadedHook = { name: string; config: HookConfig; handler: HookHandler };

const HOOKS: LoadedHook[] = [
  {
    name: "current-datetime",
    config: currentDatetimeConfig as HookConfig,
    handler: currentDatetimeHandler,
  },
];
// ────────────────────────────────────────────────────────────────────────────

function loadHooks(): LoadedHook[] {
  return HOOKS;
}

// input[key] (chuỗi/mảng) có giao với danh sách giá trị chấp nhận không?
function inputMatches(
  input: Record<string, unknown>,
  match?: Record<string, string[]>
): boolean {
  if (!match) return true;
  for (const [key, allowed] of Object.entries(match)) {
    const v = input[key];
    const vals = Array.isArray(v)
      ? v.map(String)
      : v == null
        ? []
        : [String(v)];
    if (!vals.some((x) => allowed.includes(x))) return false;
  }
  return true;
}

/**
 * Chạy mọi hook khớp (theo tool + timing + match), trả về danh sách đoạn text
 * cần chèn vào tool_result. Lỗi của một hook KHÔNG làm hỏng vòng tool (nuốt + bỏ
 * qua hook đó).
 */
export async function runHooks(
  timing: HookTiming,
  ctx: Omit<HookContext, "timing">
): Promise<string[]> {
  const injects: string[] = [];
  for (const h of loadHooks()) {
    if (h.config.timing !== timing) continue;
    if (h.config.tool !== ctx.tool) continue;
    if (!inputMatches(ctx.input, h.config.match)) continue;
    try {
      const out = await h.handler({ ...ctx, timing });
      if (out && out.inject) injects.push(out.inject);
    } catch {
      // Hook lỗi → bỏ qua, không chặn tool.
    }
  }
  return injects;
}
