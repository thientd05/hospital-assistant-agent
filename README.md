# FamilyHealthAI — AI Agent cho chuỗi phòng khám gia đình

Một AI agent điều khiển giao diện ứng dụng *như con người*: tự mở panel, đọc trạng thái màn hình, click nút thật và điền form thật thay cho bác sĩ & bệnh nhân — thay vì gọi các hàm nghiệp vụ chuyên biệt.

### 🎬 Video demo

[![Xem demo trên YouTube](https://img.shields.io/badge/▶_Xem_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/ITKtBXB5ASc)

> 📺 **Link demo:** https://youtu.be/ITKtBXB5ASc

🔗 **Live:** [family-healthcare-ai-thienta.vercel.app](https://family-healthcare-ai-thienta.vercel.app)

---

## Bài toán

Phần lớn "AI agent" trong thực tế chỉ là một LLM gọi vài hàm chuyên biệt: `createAppointment()`, `updatePatient()`, `prescribeDrug()`… Cách này có ba điểm yếu cố hữu:

1. **Trùng lặp logic** — mỗi nghiệp vụ tồn tại hai lần: một bản cho UI người dùng, một bản cho agent. Validation, tính toán, side-effect dễ lệch nhau theo thời gian.
2. **Không mở rộng được** — thêm một nghiệp vụ = viết tool mới + sửa code + deploy lại.
3. **Khó kiểm soát** — agent thao tác thẳng vào DB, bỏ qua mọi rào chắn mà UI đã có.

Dự án này tiếp cận khác: **agent điều khiển chính giao diện của ứng dụng**, giống một coding-agent điều khiển trình duyệt. Agent không có tool "kê đơn"; nó có tool "nhìn màn hình" và "click/gõ", rồi *học* cách kê đơn từ một tài liệu kỹ năng. Mọi thao tác đi qua đúng các handler, validation và REST call mà người dùng thật cũng đi qua.

---

## Kiến trúc agent

```
   Người dùng: "Kê Amoxicillin cho bệnh nhân này, chẩn đoán viêm họng cấp"
                                  │
                 ┌────────────────▼─────────────────┐
                 │  Agent loop (Claude · tool-use)   │
                 │  1. match skill theo mô tả        │
                 │  2. read_skills(['prescribe-...']) │   ← học cách làm (lazy)
                 │  3. read_panel  → snapshot panel   │   ← "nhìn" màn hình
                 │  4. act([click, type, select...]) │   ← thao tác theo ref
                 └────────────────┬─────────────────┘
                                  │ tool_command (SSE)
                 ┌────────────────▼─────────────────┐
                 │  Frontend panel — DOM thật        │
                 │  click button có sẵn              │
                 │  → handler cũ validate + REST      │
                 │  → kiểm tra tương tác thuốc tự động│
                 │  → refetch + đóng form             │
                 └───────────────────────────────────┘
```

Agent chỉ có một bộ tool *generic*, mô phỏng hành vi con người chứ không phải nghiệp vụ:

| Tool | Mô tả |
|------|-------|
| `read_panel` | "Nhìn" panel qua một *accessibility snapshot* có cấu trúc. Hai chế độ: `public` (mở panel cho người dùng thấy khi sắp thao tác) vs `silent` (đọc ngầm, panel ẩn — dùng khi chỉ trích xuất dữ liệu để vẽ biểu đồ). |
| `act` | Chạy tuần tự một mảng action (`click`/`type`/`select`/`check`) nhắm theo `ref`. Có độ trễ để người dùng quan sát; dừng và trả trace khi một bước lỗi. |
| `read_skills` | Nạp body skill từ MongoDB đúng lúc cần (lazy), không nhồi sẵn vào system prompt. |
| `update_workspace_file` | Agent tự ghi bài học khi mắc lỗi vào bộ nhớ dài hạn. |
| `read_exam_history` / `read_service_prices` | Truy vấn read-only để dựng dashboard / tư vấn. |

**Snapshot-driven, không scrape HTML.** Agent không bao giờ đọc HTML thô — nó nhận một cây phần tử `{ref, role, label, value, disabled}` do frontend phát ra. Frontend được "instrument" bằng các thuộc tính `data-agent-ref / -role / -label`, cộng `data-agent-busy` để engine biết chờ REST hoàn tất trước khi action tiếp. Đây là pattern của computer-use / browser agent, áp vào một panel React nội bộ.

**Kỹ năng tách khỏi code.** Mỗi skill là một file Markdown (frontmatter `name` + `description`) nằm trong MongoDB. Agent loop chỉ nạp *index* từ description (rẻ), body được đọc lazy qua `read_skills`. Thêm/sửa nghiệp vụ = sửa skill, áp dụng ngay lượt chat sau, **không deploy lại code**.

---

## Những bài toán kỹ thuật đã giải quyết

### 1. Agent và UI dùng chung một đường nghiệp vụ
Thay vì cho agent gọi REST trực tiếp, agent gửi `tool_command` xuống frontend; engine `panel-agent.ts` thao tác **DOM thật** — click đúng button mà người dùng cũng click. Hệ quả: validation, tính toán (vd kiểm tra tương tác thuốc khi chọn ≥2 thuốc), refetch, đóng form… đều tái dùng 100%. Không có lớp nghiệp vụ thứ hai để lệch.

### 2. Cho agent "nhìn" mà không ảo giác cấu trúc trang
Nếu đưa HTML thô, LLM hay bịa ra `id`/selector không tồn tại. Giải pháp là một lớp snapshot trung gian: chỉ phơi ra phần tử đã được instrument, mỗi cái có `ref` ổn định. Agent nhắm action bằng `ref` → không có chuyện "click vào nút tưởng tượng". Một gotcha đi kèm: dữ liệu ở các tab chỉ-xem phải gắn `role="text"` thì agent mới đọc được — không instrument thì agent "mù" tab đó.

### 3. Đọc ngầm để vẽ, không làm phiền người dùng
Khi agent chỉ cần dữ liệu để vẽ biểu đồ (không sửa gì), việc bật panel nhảy tab trước mắt người dùng gây rối. Tách `isMounted` (gắn DOM để snapshot đọc được) khỏi `isOpen` (hiển thị): chế độ `silent` mount panel với width 0 — agent đọc đủ dữ liệu, người dùng không thấy gì nhấp nháy. `act` kế thừa trạng thái hiển thị của lần `read_panel` gần nhất nên điều hướng cũng ngầm theo.

### 4. Bơm context đúng lúc mà không phình system prompt — Hook framework
Có những thông tin chỉ cần cho *một* tác vụ. Ví dụ: đặt lịch hẹn cần biết "hôm nay thứ mấy" để quy đổi "tuần sau", nhưng nhồi ngày giờ vào mọi lượt chat là lãng phí. Giải pháp là một **hook framework** chạy xen quanh tool (kiểu middleware): mỗi hook khai báo `{tool, timing: before|after, match}`. Hook `current-datetime` chạy *trước* `read_skills('book-appointment')`, bơm ngày giờ VN vào đúng tool_result đó — context xuất hiện đúng lúc, biến mất khi không cần.

### 5. Tối ưu chi phí với prompt caching phân tầng
System prompt được tách hai mảnh quanh cache-breakpoint của Anthropic: phần `stable` (boot + index skill + hồ sơ người dùng) mang breakpoint; phần `memory` (bài học động) nối *sau*, không breakpoint riêng. Khi agent học điều mới và memory đổi, chỉ memory (nhỏ) + tools + messages bị bust cache — phần `stable` vẫn hit. Tránh được cảnh đổi một dòng memory làm vô hiệu toàn bộ cache.

### 6. Bộ nhớ dài hạn tự cập nhật
Mỗi user có một workspace `{user, soul, memory}` nối vào system prompt mỗi lượt. Khi agent làm sai và được người dùng chỉ ra, nó tự gọi `update_workspace_file({file:"memory"})` ghi lại *lỗi → vì sao → cách đúng*. Lượt sau bài học đã nằm trong prompt — agent sửa hành vi mà không cần can thiệp code hay restart.

### 7. Phân quyền agent theo chiều sâu
Một agent loop phục vụ cả bác sĩ lẫn bệnh nhân. Bệnh nhân có **đủ bộ tool panel** như bác sĩ, nhưng bị chặn ba lớp độc lập: (1) allowlist tool/skill theo role ở agent; (2) snapshot không phơi ô nhập của tab read-only; (3) `Schema.strict()` ở REST chặn mọi trường ngoài phạm vi. Cùng cỗ máy, khác phạm vi — và không lớp nào tin tưởng lớp nào.

### 8. Agent stateless, ranh giới microservice sạch
Service agent **không chạm MongoDB**: không import `mongodb`, verify JWT cục bộ (không query DB), mọi persistence gọi REST kèm bearer token được forward. REST là nơi duy nhất sở hữu DB. Nhờ đó agent scale độc lập và không có "đường tắt" làm rò rỉ trạng thái.

### 9. SSE streaming qua nhiều loại frame
Mỗi lượt chat là một stream SSE với các frame phân biệt: `text` (delta văn bản) · `tool_call` (kèm `refresh` để FE refetch đúng tab) · `tool_command` (điều khiển panel, có callback hai chiều + timeout) · `done`/`error`. Một gotcha thực tế: sau `reply.hijack()` của Fastify, header phải set qua `reply.raw.setHeader` *trước* `writeHead(200)` — header set qua API thường của Fastify bị mất, biểu hiện là 200 ở log nhưng "Failed to fetch" ở browser.

---

## Kiến trúc tổng thể

```
┌──────────────┐   JWT (access/refresh)   ┌──────────────────────┐
│   apps/web   │◄────────────────────────►│   apps/api (REST)    │
│  Next.js 16  │   CRUD + SSE chat        │   Fastify :3001      │
│  React 19    │                          │   5-layer · ONLY DB  │──► MongoDB
│  Tailwind v4 │   POST /chat (SSE) ┌─────►│   schema→repo→svc    │
└──────┬───────┘                    │     └──────────────────────┘
       │  tool_command / callback   │              ▲
       ▼                            │              │ REST (forward JWT)
┌──────────────────────┐           │     ┌─────────┴────────────┐
│  Panel agent engine  │           └─────│  apps/agent          │
│  buildSnapshot()     │  SSE stream      │  Fastify :3002       │
│  runActions()        │◄─────────────────│  Anthropic SDK       │
│  (DOM thật)          │                  │  STATELESS · no DB   │
└──────────────────────┘                  │  agent loop + tools  │
                                          └──────────────────────┘
```

- **Chỉ `apps/api` chạm Mongo.** `apps/agent` stateless tuyệt đối, mọi persistence qua REST.
- **Auth 2-token / 2-secret**: access (10 phút, gửi mọi request) + refresh (2 tiếng, chỉ đổi access mới); hai secret tách biệt → token nhầm loại fail chữ ký ngay. FE tự refresh-on-401.
- **Artifact trong chat**: agent vẽ được **SVG sketch** stream tăng dần từng token (sanitize bằng DOMPurify) để trực quan hóa hồ sơ/lịch hẹn ngay trong khung chat.

### Stack

| Lớp | Công nghệ |
|-----|-----------|
| **Frontend** | Next.js 16 (App Router) · React 19 · Tailwind v4 · SSE streaming |
| **Backend REST** | Fastify · MongoDB · Zod · kiến trúc 5-layer (`schema → repo → service → route`) |
| **Agent** | Fastify · Anthropic Claude (Agent SDK) · tool-use loop · prompt caching · hook framework |
| **Hạ tầng** | pnpm workspace · Turborepo · Docker Compose · Vercel + MongoDB Atlas |

---

## Cấu trúc repo

```
pr_hospitalagent/                  # pnpm workspace + Turborepo
├── apps/
│   ├── api/        # REST Fastify :3001 — 5-layer, sở hữu MỌI tương tác Mongo
│   ├── agent/      # Agent Fastify :3002 — Anthropic SDK, STATELESS, no DB
│   │   └── src/agent/
│   │       ├── loop.ts            # tool-use loop + prompt cache
│   │       ├── access.ts          # role → tool/skill allowlist
│   │       ├── tools/<name>/      # read_panel, act, read_skills, ...
│   │       ├── hooks/<name>/      # middleware xen quanh tool
│   │       └── panel-bridge.ts    # cầu 2 chiều agent ↔ panel qua SSE
│   └── web/        # Next.js 16 + React 19 + Tailwind v4
│       └── lib/panel-agent.ts     # buildSnapshot() + runActions() trên DOM thật
└── packages/
    ├── api-shared/ # connectDB, verifyAuth, requireRole (chỉ apps/api dùng)
    └── types/      # type chung qua workspace:*
```

---

## Chạy thử local

```bash
pnpm install
docker compose up -d                                   # MongoDB :27017
pnpm --filter @pr_hospitalagent/api run seed           # seed dữ liệu mẫu

# 3 terminal (hoặc dùng ./back.sh ./agent.sh ./front.sh)
pnpm --filter @pr_hospitalagent/api   dev              # REST   :3001
pnpm --filter @pr_hospitalagent/agent dev              # Agent  :3002
pnpm --filter @pr_hospitalagent/web   dev              # Web    :3000
```

**Tài khoản demo** (sau khi seed):

| Vai trò | Đăng nhập | Mật khẩu |
|--------|-----------|----------|
| Bác sĩ | `bs001` | `mkbs001` |
| Bệnh nhân | `0901234001` *(đăng nhập bằng SĐT)* | `mkbn001` |

**Biến môi trường** (`.env` ở root): `ANTHROPIC_API_KEY`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `API_URL`.
