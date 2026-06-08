# 🏥 FamilyHealthAI — AI Agent cho chuỗi phòng khám gia đình

> **AI agent điều khiển giao diện như con người** — không phải chatbot trả lời câu hỏi, mà là một *co-pilot* biết tự mở panel, đọc snapshot, click nút thật và điền form thật thay cho bác sĩ & bệnh nhân.

### 🎬 Video demo

[![Xem demo trên YouTube](https://img.shields.io/badge/▶_Xem_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/ITKtBXB5ASc)

> 📺 **Link demo:** https://youtu.be/ITKtBXB5ASc *(sẽ cập nhật)*

🔗 **Live deployment:** [family-healthcare-ai-thienta.vercel.app](https://family-healthcare-ai-thienta.vercel.app)

<p align="left">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Claude" src="https://img.shields.io/badge/Anthropic_Claude-Agent_SDK-D97757?logo=anthropic&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black">
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white">
</p>

---

## ✨ TL;DR cho nhà tuyển dụng

Đây là một **hệ thống AI agent production-grade** mô phỏng vận hành thực tế của một chuỗi phòng khám gia đình Việt Nam. Điểm nhấn kỹ thuật không nằm ở "gọi LLM trả lời", mà ở một **kiến trúc agentic hoàn chỉnh** mà tôi tự thiết kế:

- 🤖 **Agent điều khiển UI như người dùng thật** — agent "nhìn" panel qua *accessibility snapshot* (không đọc HTML thô), rồi phát ra chuỗi action `click / type / select / check` nhắm theo `ref`. Vì nó bấm vào **button thật**, mọi validation + REST call + refetch có sẵn đều chạy lại đúng — *zero* logic nghiệp vụ trùng lặp giữa agent và UI.
- 🧩 **Skill động lưu ngoài codebase** — kỹ năng nghiệp vụ của agent được viết bằng Markdown, lưu trong MongoDB, soạn qua UI dành cho "chuyên gia". Thêm năng lực mới cho agent **không cần deploy lại code**.
- 🪝 **Hook framework** xen vào vòng lặp tool-use (kiểu middleware) để bơm context đúng lúc.
- ⚡ **Prompt caching** phân tầng theo cache-breakpoint của Anthropic để tối ưu chi phí/độ trễ.
- 🏗️ **Kiến trúc microservice** tách biệt rạch ròi: agent **stateless, không chạm DB**.
- 🔐 **Auth 2-token / 2-secret** (access + refresh) tự refresh-on-401.

> Toàn bộ giao diện và agent đều bằng **tiếng Việt**, phục vụ bối cảnh y tế Việt Nam thực tế.

---

## 🧠 Vì sao dự án này "agentic" thật sự?

Phần lớn demo "AI agent" chỉ là một LLM gọi vài hàm chuyên biệt (`createAppointment()`, `updatePatient()`…). Cách đó không scale: mỗi nghiệp vụ mới = một tool mới + một lần deploy.

Dự án này đi theo triết lý **agent giống một coding-agent điều khiển trình duyệt** — chỉ vài tool *generic*, còn "biết làm gì" thì dạy bằng skill:

```
        ┌─────────────────────────────────────────────────────────┐
        │  Người dùng: "Kê cho bệnh nhân này Amoxicillin + ghi      │
        │               chẩn đoán viêm họng cấp"                    │
        └────────────────────────────┬────────────────────────────┘
                                     │
                    ┌────────────────▼─────────────────┐
                    │  Agent Loop (Claude + tool-use)   │
                    │  1. match skill theo mô tả        │
                    │  2. read_skills(['prescribe-...']) │
                    │  3. read_panel → "nhìn" snapshot   │
                    │  4. act([click, type, select...]) │
                    └────────────────┬─────────────────┘
                                     │ tool_command (SSE)
                    ┌────────────────▼─────────────────┐
                    │  Frontend panel (DOM thật)        │
                    │  → click button có sẵn            │
                    │  → handler cũ validate + REST      │
                    │  → kiểm tra tương tác thuốc tự động│
                    └───────────────────────────────────┘
```

**Hệ quả thiết kế:**

| Vấn đề kinh điển của agent | Cách dự án giải quyết |
|---|---|
| Thêm nghiệp vụ = sửa code + deploy | Viết **skill Markdown** trong DB → áp dụng ngay lượt chat sau |
| Agent và UI có 2 đường code nghiệp vụ | Agent **bấm nút thật** → tái dùng 100% handler + validation của UI |
| Agent "ảo giác" cấu trúc trang | Agent đọc **snapshot có cấu trúc** (`{ref, role, label, value}`), không parse HTML |
| Bơm context cho mọi lượt rất tốn token | **Hook** chỉ bơm context (vd ngày giờ) khi gắn với đúng một tool |
| Token nhạn chế quyền | **2 tầng phân quyền tách biệt**: allowlist tool (LLM) ≠ route guard (REST) |

---

## 🛠️ Bộ công cụ generic của agent

Thay vì hàng chục tool chuyên biệt, agent chỉ có một bộ tool *giống hành vi con người*:

| Tool | Vai trò | Ý nghĩa kỹ thuật |
|------|---------|------------------|
| `read_panel` | "Nhìn" panel | Trả về snapshot accessibility; 2 chế độ **`public`** (mở panel cho người dùng thấy) vs **`silent`** (đọc ngầm, panel vô hình để chỉ trích xuất dữ liệu rồi vẽ biểu đồ) |
| `act` | "Thao tác" | Chạy tuần tự một mảng action trên `ref`, có độ trễ để con người quan sát, dừng + trả trace khi lỗi |
| `read_skills` | Học cách làm | Nạp body skill từ MongoDB đúng lúc cần (lazy) |
| `update_workspace_file` | Tự học/ghi nhớ | Agent tự ghi *bài học khi mắc lỗi* vào bộ nhớ dài hạn (`memory/soul/user`), áp dụng ngay lượt sau |
| `read_exam_history` / `read_service_prices` | Truy vấn read-only | Lấy dữ liệu để dựng dashboard/tư vấn |

**Snapshot-driven, không phải HTML-driven** — agent điều khiển panel mà không bao giờ đọc HTML thô. Frontend được "instrument" bằng `data-agent-ref / -role / -label`, và `data-agent-busy` để engine biết chờ REST hoàn tất. Đây chính là pattern của các *computer-use / browser agent* hiện đại, áp vào một panel React nội bộ.

---

## 🎭 Bốn vai trò — một agent đa ngữ cảnh

| Vai trò | Trải nghiệm | Quyền của agent |
|--------|-------------|-----------------|
| 🩺 **Bác sĩ** | Chat co-pilot + panel hồ sơ lâm sàng | Sửa khoa/chẩn đoán/thuốc/sinh hiệu/xét nghiệm, duyệt lịch hẹn, vẽ dashboard lịch sử khám |
| 🧑‍🦰 **Bệnh nhân** | Chat hỏi đáp + panel tối thiểu quyền | Tự điền hồ sơ cá nhân, tự đặt lịch, tra bảng giá — nhưng **bị chặn cứng 2 lớp** không sửa được dữ liệu lâm sàng |
| 👔 **Quản lý** | Dashboard tài chính (Recharts) | CRUD tài khoản, chi phí, doanh thu — *không* chatbot |
| 🧪 **Chuyên gia** | **Tác giả skill cho agent** + audit hội thoại | Viết/sửa kỹ năng agent bằng Markdown, duyệt mọi hội thoại AI để cải thiện chất lượng |

> Vai trò **Chuyên gia** chính là "ops loop" của hệ thống agent: con người quan sát hội thoại thật → tinh chỉnh skill → agent giỏi lên mà không cần kỹ sư deploy. Đây là một thiết kế **human-in-the-loop / prompt-ops** mà nhà tuyển dụng GenAI sẽ đánh giá cao.

---

## 🏛️ Kiến trúc hệ thống

```
┌──────────────┐   JWT (access/refresh)   ┌──────────────────────┐
│   apps/web   │◄────────────────────────►│   apps/api (REST)    │
│  Next.js 16  │   CRUD + SSE chat        │   Fastify :3001      │
│  React 19    │                          │   5-layer · ONLY DB  │──► MongoDB
│  Tailwind v4 │   POST /chat (SSE) ┌─────►│   schemas→repo→svc   │
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

**Nguyên tắc cốt lõi:**

- 🔒 **Chỉ `apps/api` chạm Mongo.** `apps/agent` **stateless tuyệt đối** — không import `mongodb`, verify JWT cục bộ (không query DB), mọi persistence gọi REST kèm bearer token. Đây là ranh giới microservice sạch giúp scale agent độc lập.
- 🔁 **2-token, 2-secret**: access token sống 10 phút (gửi mọi request), refresh token sống 2 tiếng (chỉ đổi access mới). Hai secret tách biệt → token nhầm loại **fail chữ ký ngay**. FE tự `refresh-on-401`.
- 🎨 **Artifact trong chat**: agent có thể vẽ **SVG sketch** stream tăng dần từng token (sanitize bằng DOMPurify) để trực quan hóa hồ sơ/lịch hẹn ngay trong khung chat.
- 📡 **Streaming SSE** từng frame: `text` (delta) · `tool_call` (kèm `refresh` để FE refetch tab) · `tool_command` (điều khiển panel) · `done/error`.

### Stack

| Lớp | Công nghệ |
|-----|-----------|
| **Frontend** | Next.js 16 (App Router) · React 19 · Tailwind v4 · Recharts · SSE streaming |
| **Backend REST** | Fastify · MongoDB · Zod · kiến trúc 5-layer (`schema → repo → service → route`) |
| **Agent** | Fastify · **Anthropic Claude (Agent SDK)** · tool-use loop · prompt caching · hook framework |
| **Hạ tầng** | pnpm workspace · Turborepo · Docker Compose · deploy Vercel (3 project) + MongoDB Atlas |
| **Auth** | JWT 2-token/2-secret · refresh-on-401 |

---

## ⚙️ Điểm nhấn kỹ thuật chi tiết

<details>
<summary><b>1. Prompt caching phân tầng (tối ưu chi phí & độ trễ)</b></summary>

System prompt được tách 2 mảnh để thân thiện với cache-breakpoint của Anthropic:
- `stable` = boot + index skill + hồ sơ người dùng + "soul" → mang cache breakpoint.
- `memory` (bài học động) nối **sau**, không breakpoint riêng → khi agent học điều mới, chỉ phần memory (nhỏ) + tools + messages bị bust cache, phần `stable` vẫn hit.

Cache ephemeral được đặt ở tool cuối, message block cuối và system prompt.
</details>

<details>
<summary><b>2. Hook framework — middleware quanh tool</b></summary>

Mỗi hook = một thư mục `{config.json, handler.ts}` khai báo *gắn vào tool nào, chạy trước/sau, khớp tham số gì*. `dispatchTool` gọi `runHooks("before"|"after")` rồi gộp output vào cùng `tool_result`.

Ví dụ thật: hook `current-datetime` chạy **trước** `read_skills('book-appointment')` → bơm ngày giờ Việt Nam để agent tự quy đổi *"thứ mấy / tuần này / tuần sau"* mà không phải hỏi lại bệnh nhân ngày cụ thể. Context được nạp **đúng lúc**, không phình system prompt mọi lượt.
</details>

<details>
<summary><b>3. Skill động lưu trong MongoDB</b></summary>

Kỹ năng agent là Markdown có frontmatter (`name` / `description`), lưu ở collection `skills`. Loop chỉ build *index* từ description (rẻ); body được nạp lazy khi agent gọi `read_skills`. Triết lý: **skill ngắn, chia nhỏ theo từng nhiệm vụ** — đọc một phát là gen được trọn chuỗi `read_panel → act`, tối thiểu số bước. Chuyên gia soạn skill qua UI, không cần kỹ sư.
</details>

<details>
<summary><b>4. Bộ nhớ dài hạn tự cập nhật</b></summary>

Workspace mỗi user gồm `user` (sự thật bền) + `soul` (preference) + `memory` (bài học khi mắc lỗi). Khi agent làm sai và được người dùng chỉ ra, nó tự gọi `update_workspace_file({file:"memory"})` ghi lại *lỗi → vì sao → cách đúng*. Lượt sau, bài học đã nằm trong system prompt — **agent tự sửa hành vi mà không cần restart**.
</details>

<details>
<summary><b>5. Hai tầng phân quyền tách biệt</b></summary>

1. **Agent allowlist** (`access.ts` + `config.json`) — tool/skill nào LLM được gọi, chỉ sống trong `apps/agent`.
2. **Route guard** (`requireRole`) — ai vào được endpoint REST nào.

Bệnh nhân có đủ bộ tool panel nhưng *chỉ thao tác được hồ sơ của chính mình*: rào chắn lớp 1 (snapshot không phơi ô nhập của tab read-only) + lớp 2 (`Schema.strict()` chặn trường ngoài phạm vi). Phòng thủ chiều sâu kiểu production.
</details>

---

## 📂 Cấu trúc repo

```
pr_hospitalagent/                  # pnpm workspace + Turborepo
├── apps/
│   ├── api/        # REST Fastify :3001 — 5-layer, sở hữu MỌI tương tác Mongo
│   ├── agent/      # Agent Fastify :3002 — Anthropic SDK, STATELESS, no DB
│   │   └── src/agent/
│   │       ├── loop.ts            # tool-use loop + prompt cache
│   │       ├── access.ts          # role → tool/skill allowlist
│   │       ├── tools/<name>/      # read_panel, act, read_skills, ...
│   │       ├── hooks/<name>/      # middleware quanh tool
│   │       └── panel-bridge.ts    # cầu 2 chiều agent ↔ panel qua SSE
│   └── web/        # Next.js 16 + React 19 + Tailwind v4
│       └── lib/panel-agent.ts     # buildSnapshot() + runActions() trên DOM thật
└── packages/
    ├── api-shared/ # connectDB, verifyAuth, requireRole (chỉ apps/api dùng)
    └── types/      # type chung qua workspace:*
```

---

## 🚀 Chạy thử local

```bash
pnpm install
docker compose up -d                                   # MongoDB :27017
pnpm --filter @pr_hospitalagent/api run seed           # seed toàn bộ dữ liệu mẫu

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
| Quản lý | `ql001` | `mkql001` |
| Chuyên gia | `cg001` | `mkcg001` |

**Biến môi trường** (`.env` ở root): `ANTHROPIC_API_KEY`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `API_URL`.

---

## 🧰 Năng lực GenAI / Agent thể hiện trong dự án

- ✅ Thiết kế **agent loop tool-use** end-to-end với Anthropic Claude
- ✅ **Computer-use / UI-control pattern** qua accessibility snapshot (không scrape HTML)
- ✅ **Tool design generic** thay vì tool chuyên biệt — agent học hành vi qua skill
- ✅ **Hook / middleware** bơm context theo ngữ cảnh
- ✅ **Prompt caching** phân tầng tối ưu chi phí
- ✅ **Bộ nhớ dài hạn** tự cập nhật (reflective memory)
- ✅ **SSE streaming** real-time (text + tool + artifact)
- ✅ **Human-in-the-loop prompt-ops** (chuyên gia soạn skill + audit hội thoại)
- ✅ **Phân quyền chiều sâu** cho agent (allowlist + route guard + schema strict)
- ✅ Kiến trúc **microservice** với agent stateless, scale độc lập
- ✅ Triển khai **serverless production** (Vercel + MongoDB Atlas)

---

<p align="center">
  <i>Xây dựng bởi <b>thientd05</b> · Một showcase về kỹ thuật AI Agent thực chiến.</i>
</p>
```
