# 01 — Architecture: How Trackit Fits Into FFCS Without Rewrite

## 1. Constraints to respect

**FFCS today:**
- `FFCS` = `Next.js 16` with `output: 'export'` (`next.config.ts:4`), `trailingSlash:true`, `images.unoptimized:true` → **fully static** `out/` → deploy free on GitHub Pages / Cloudflare Pages. All fetches are client-side `src/lib/api.ts` `API_BASE = NEXT_PUBLIC_API_URL` → `apiFetch()` with JWT refresh queue.
- `FFCS-backend` = `Express 4.21` + `Prisma 6.14` (`prisma/schema.prisma` `provider = "sqlite"` dev, `schema.postgres.prisma` prod) + `sqlite dev.db` / Postgres Neon. Stateless, no NextAuth, no Kysely.

**Trackit today:**
- `Next.js 14` SSR + `Kysely 0.26 + pg 8` `Postgres` pooled `6543`/`5432`, `NextAuth 4.24` (Google + Email via `plunk`), `Group.isDefault` + `GroupMember Role OWNER/ADMIN/MEMBER`, `AttendanceReport.membersPresence JSON` store, `InPersonEvent` + `InPersonEventAttendee`.
- Extension hard-coded `https://trackit.visualbrahma.tech/*` in `manifest.json:29` + `background.js`.

**Decision:** **Do not SSR-ify FFCS.** Keep `output:'export'` static advantage. All attendance logic lives in `FFCS-backend` (add tables) + client-side UI in `FFCS` + repackaged extension targeting `NEXT_PUBLIC_API_URL`. No `NextAuth` inside FFCS frontend.

---

## 2. Target architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Browser +      │      │  FFCS (Next 16)  │      │ FFCS-backend    │
│  Extension /    │◄────►│  static export   │◄────►│ Express+Prisma  │
│  Tauri wrapper  │      │  /admin/attendance│     │ + new attendance │
│  attendance.js  │      │  /in-person/[slug]│     │ tables          │
│  save.js        │      │  import CSV       │      │ Postgres/SQLite │
└─────────────────┘      └──────────────────┘      └─────────────────┘
         │                         │                        │
         └──── chrome.storage ─────┘                        │
              localStorage bridge                     award bulk → Point → leaderboard
```

### New modules (no breaking changes)

| Layer | Additions |
|---|---|
| **FFCS-backend `prisma/schema.prisma`** | `MemberProfile`, `AttendanceSession`, `AttendanceRecord`, `InPersonEvent`, `InPersonAttendee` (port from Trackit), extend `User` with `registerNo`, `school`, `programme`, `vitEmail` |
| **FFCS-backend `src/routes/`** | `attendance.ts` (CRUD + import + compare), `members.ts` (FFCS list import), `admin.ts` extend with `award-bulk` |
| **FFCS `src/app/(admin)/attendance`** | List, detail `[id]`, import, QR scan, compare view |
| **FFCS `src/app/in-person/[slug]`** | Public register + QR display (mirrors Trackit `apps/web/src/app/(application)/(public)/in-person/[slug]`) — kept client-side fetch so static export still works |
| **Extension `ffcs-extension/`** | Fork of `trackit/apps/browser-extension` retargeted to `FFCS` API, built with `wxt` (Vite) |
| **Desktop `ffcs-desktop/`** | Tauri 2 app wrapping `FFCS` `out/` + bundling extension via `tauri-plugin` |

### Why not reuse Trackit Kysely/NextAuth?

- FFCS backend already has `Prisma` + `bcryptjs` + `jsonwebtoken` JWT. Porting Trackit's `KyselyAuth` adapter would duplicate auth. Instead: recreate tables in Prisma (SQLite/Postgres dual).
- Trackit's `Group` abstraction (`isDefault` per user) maps 1:1 to FFCS `User` solo — we simplify: remove `Group`/`GroupMember`, use `User.role` `SUPER_ADMIN/ADMIN/MEMBER` already exists. Only keep `createdById` on sessions.

---

## 3. Data flow mapping

### In-Meet (Google Meet)

**Before (Trackit):**
`meet.google.com` DOM → `attendance.js:23 track_attendance() 1s` → `attendanceData Map` → `chrome.storage.local` → `window.open /save-report` → `save.js chrome.storage→localStorage` → `upload-attendance-report.tsx setTimeout 100ms` → `lib/api/reports/upload.ts` → `INSERT Meeting + AttendanceReport(membersPresence)`

**After (FFCS):**
`meet.google.com` DOM → `ffcs-extension/attendance.js` (same selectors, but add RegNo parser) → `chrome.storage.local` → `POST ${API_BASE}/api/attendance/meet` (JWT) with `{meetCode, date, startTime, stopTime, participants: [{rawName, registerNo, email, joinTime, leaveTime, attendedDuration}]}` → backend `prisma.attendanceSession.create` + `attendanceRecord.createMany` → frontend polls `/api/attendance/session/:id` → compare.

*Improvement:* Also accept **Google's native CSV export** via `Upload CSV` button (Trackit had `apps/web/src/app/(application)/(protected)/dashboard/in-person/new/upload-csv.tsx` papaparse pattern — reuse).

### In-Person (QR)

**Before (Trackit):**
`createInPersonAttendanceLink` → `InPersonEvent(slug, allowedEmailDomains/allowedEmails)` → share `/in-person/[slug]` → `registerToInPersonEvent` → `InPersonEventAttendee(registrationTime)` → `qr.tsx JSON {eventId,userId}` → `scan/page.tsx QrReader → checkInToInPersonEvent(checkInTime)` → report `page.tsx JOIN User`

**After (FFCS):**
Identical but backend is `FFCS-backend` `POST /api/attendance/in-person` + `POST /api/attendance/in-person/:id/register` (public, optional auth) + `POST /api/attendance/in-person/:id/checkin` (`ADMIN` only). Public page is still `FFCS/src/app/in-person/[slug]/page.tsx` but fetches via `apiFetch` (client-side) to keep export static.

---

## 4. Extension → Backend contract

Trackit used `localStorage` bridge because extension couldn't call Next.js server actions from `meet.google.com`. FFCS extension will call backend directly with JWT:

```ts
// ffcs-extension/background.ts
chrome.storage.local.get('ffcs_tokens', ({access}) => {
  fetch(`${API_BASE}/api/attendance/meet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type':'application/json' },
    body: JSON.stringify(attendanceDetails)
  })
})
```

Tokens stored via `ffcs-extension/save.js` equivalent but using `chrome.storage` → `localStorage` sync already handled by `FFCS/src/lib/api.ts` `ACCESS_KEY = "ffcs_access"`. Extension reads same keys.

Fallback: if offline / 401, keep in `chrome.storage.local` queue and retry on next `attendance.js stop()`.

---

## 5. Static export compatibility

FFCS `next.config.ts:4 output:'export'` forbids `getServerSideProps` / `cookies()` / `getServerSession()`. All new attendance pages must be `"use client"` + `apiFetch`:

```ts
// FFCS/src/app/attendance/[id]/page.tsx (new)
"use client"
useEffect(()=>{ apiFetch(`/api/attendance/session/${id}`).then(...) },[id])
```

Public QR pages same — no `dbClient.selectFrom` server calls. Trackit's `apps/web/src/app/(application)/(public)/in-person/[slug]/page.tsx:24 dbClient` is replaced by `GET /api/attendance/in-person/:slug`.

This keeps `pnpm build` → `out/` deployable on Pages.

---

## 6. Security & isolation

- Keep existing `helmet`, `cors` (`src/index.ts:22`), `generalLimiter`, `authLimiter`, `awardLimiter`. Add `attendanceLimiter` `30/min` for meet uploads.
- `requireAuth` + `requireRole("ADMIN","SUPER_ADMIN")` for session creation / bulk award. Public `register` is `optionalAuth` with `allowedEmailDomains` check (reuse Trackit `action.tsx:40` domain logic).
- No `plunk` email magic link — FFCS already uses `bcrypt` passwords; keep that. Optionally add Google OAuth later mirroring Trackit `GoogleProvider allowDangerousEmailAccountLinking`.

Next: `02-data-model.md` — exact Prisma schema + RegNo parsing + FFCS master import.
