# Center Hook Backend

Webhook กลางของ LINE OA ทำหน้าที่รับ event จาก LINE แล้วส่งต่อไปยัง project เจ้าของ event และบันทึก log การส่งต่อทุกครั้ง

```
LINE OA ──POST /api/line/webhook──► center-hook
   1. ตรวจ x-line-signature ด้วย LINE_CHANNEL_SECRET (ไม่ผ่าน → 401)
   2. ตอบ 200 ให้ LINE ทันที แล้วส่งต่อเบื้องหลัง
   3. แยกทีละ event → เลือก project ตาม rule
        ├─ ตรง rule ของ Labor → LABOR_WEBHOOK_URL
        └─ ไม่ตรง rule ไหน    → WEBHOOK_URL (default)
   4. ส่ง { destination, events: [event] } พร้อมเซ็น x-line-signature ใหม่ด้วย secret เดิม
   5. บันทึก forward_logs (SUCCESS / FAILED / SKIPPED)
```

ปลายทางจะได้ request หน้าตาเหมือนที่ LINE ส่งมา และตรวจ signature ด้วย channel secret เดิมได้ ไม่ต้องแก้โค้ดฝั่งปลายทาง

## Tech Stack

| Technology | Version | Role |
| --- | --- | --- |
| [Bun](https://bun.sh) | 1.4.4 | runtime และ package manager |
| [TypeScript](https://www.typescriptlang.org) | 7.0.2 | ภาษา |
| [Hono](https://hono.dev) | 4.13.18 | web framework |
| PostgreSQL | 16 | database |
| [Prisma](https://www.prisma.io) | 7.10.1 | ORM และ migration |
| Docker | `oven/bun:1.4.4-alpine` | container สำหรับ deploy |

## Libraries

| Library | Version | Purpose |
| --- | --- | --- |
| `@hono/node-server` | 2.1.8 | รัน Hono เป็น HTTP server (อ่าน IP จาก socket ได้) |
| `@prisma/client`, `@prisma/adapter-pg` | 7.10.1 | Prisma client ต่อ PostgreSQL ผ่าน driver `pg` |
| `zod` | 4.6.7 | validate body, query และ payload ของ token |
| `jsonwebtoken` | 9.0.3 | เซ็น/ตรวจ JWT (HS256) |
| `argon2` | 0.45.2 | hash password (argon2id) |
| `hono-rate-limiter` | 0.5.4 | rate limit ต่อ IP / ต่อบัญชี |
| `yaml` | 2.9.1 | อ่าน OpenAPI YAML มารวมเป็น spec |
| `swagger-ui-dist` | 5.35.0 | เสิร์ฟ Swagger UI ที่ `/api-docs` |
| `pino` | 10.4.0 | log แบบ JSON |
| `dotenv` | 18.0.10 | โหลด `.env` |
| `tsx` (dev) | 4.23.15 | ให้ `node --test` รันไฟล์ TypeScript ได้ (ต้องมี Node.js 22+) |

Version คือเวอร์ชันที่ล็อกไว้ใน `bun.lock` (ใน `package.json` เป็นช่วง `^`) Middleware ในตัวของ Hono ที่ใช้: `secure-headers`, `cors`, `body-limit`, `request-id`, `basic-auth`

## Routing rule

แต่ละ project แยก rule ไว้คนละไฟล์ใน [src/projects](src/projects)

| Project | File | Env | Events received |
| --- | --- | --- | --- |
| `labor` | [labor.project.ts](src/projects/labor.project.ts) | `LABOR_WEBHOOK_URL` | postback ที่ `data` เป็น `token=<32 ตัว base64url>` (มี `score` ได้) และข้อความ `id` |
| `default` | [index.ts](src/projects/index.ts) | `WEBHOOK_URL` | ทุก event ที่ไม่ตรง rule labor project |

rule ของ Labor อ้างอิงรูปแบบ postback data ที่ Labor สร้างอยู่ตอนนี้ ถ้า Labor เปลี่ยนรูปแบบ ต้องแก้ `labor.project.ts` ด้วย

การเพิ่ม project ใหม่: สร้าง `src/projects/<name>.project.ts` (export `ProjectRoute`) แล้วเพิ่มลงใน `PROJECT_ROUTES` ใน [src/projects/index.ts](src/projects/index.ts) พร้อม env ของ URL

## Forwarding

- timeout ต่อครั้ง `FORWARD_TIMEOUT_MS` (10 วินาที)
- retry สูงสุด `FORWARD_MAX_ATTEMPTS` ครั้ง (3) เฉพาะ 5xx, 429, timeout และ network error โดยรอ `FORWARD_RETRY_DELAY_MS × attempt`
- 4xx ไม่ retry
- ไม่ได้ตั้ง URL ของ project → log เป็น `SKIPPED`
- ส่ง event ใน request เดียวกันตามลำดับ
- log เก่ากว่า `FORWARD_LOG_RETENTION_DAYS` (90 วัน) จะถูกลบอัตโนมัติทุก 6 ชั่วโมง

### Swagger

เปิด `/api-docs` (spec JSON ที่ `/api-docs/openapi.json`) สเปกเขียนเป็น YAML แยกไฟล์ตามกลุ่ม route ไว้ที่ [src/docs/openapi/](src/docs/openapi/) แล้ว [src/docs/swagger.ts](src/docs/swagger.ts) อ่านทุกไฟล์ใน `OPENAPI_FILES` มารวม `paths` และ `components` เป็น spec เดียวตอนเริ่ม server (ชื่อ path หรือ component ซ้ำข้ามไฟล์จะ error ทันที) เพิ่มไฟล์ใหม่ต้องใส่ชื่อลงใน `OPENAPI_FILES` ด้วย Swagger UI เสิร์ฟจาก `swagger-ui-dist` ในเครื่อง ไม่ใช้ CDN

- ตั้ง `API_DOCS_USERNAME` / `API_DOCS_PASSWORD` = ต้องใส่ Basic auth
- ไม่ตั้งใน production (`NODE_ENV=production`) = ปิด docs (404)
- ไม่ตั้งตอน dev = เปิดโล่ง

### Postman

Import [Postman_Collection.json](Postman_Collection.json) ตั้ง `baseUrl` ให้ตรงกับ PORT แล้วรัน Auth > Login (Owner) ก่อน token จะถูกเก็บลง collection variable ให้อัตโนมัติ request LINE webhook ต้องตั้ง `lineChannelSecret` ให้ตรงกับ `LINE_CHANNEL_SECRET` (event จะถูกส่งต่อไปปลายทางจริง)

### Auth

แนวทางเดียวกับ Labor Project: argon2 password, JWT HS256 (access 15 นาที, refresh 24 ชั่วโมง), session ใน DB เก็บ HMAC ของ refresh token, หนึ่ง account มี session เดียว (login ใหม่ทำให้ session เก่าใช้ไม่ได้), rate limit ดูหัวข้อ Rate limiting

Role มี 2 ขั้น:

| Role | Permissions | Source |
| --- | --- | --- |
| `owner` | `forward_logs:read`, `accounts:create` | มีคนเดียว สร้างจาก seed เท่านั้น |
| `admin` | `forward_logs:read` | owner สร้างผ่าน `POST /api/accounts` (admin สร้างบัญชีไม่ได้) |

Seed สร้างบัญชี owner (username `owner`, password `Owner@123456`) เมื่อยังไม่มี owner ในระบบเท่านั้น รันซ้ำจะไม่สร้างเพิ่มและไม่ทับ password เดิม ถ้าต้องการค่าอื่นให้แก้ที่ [prisma/seed.ts](prisma/seed.ts) ก่อนรัน seed

## Common Commands

ต้องมี [Bun 1.4.4](https://bun.sh) (Windows: `powershell -c "irm bun.sh/install.ps1 | iex"` อย่าติดตั้งผ่าน npm), Docker และ Node.js 22+ (สำหรับ test)

```bash
bun install
cp .env.example .env          # แก้ค่า secret และ URL
bun run docker:db             # Postgres ที่ localhost:5435
bun run db:deploy             # หรือ bun run db:migrate ตอนแก้ schema
bun run db:seed
bun run dev
```
