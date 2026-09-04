# 03 — Attendance Flows: In-Meet, Out-of-Meet, Import, Compare → Points

## Flow A: Google Meet (In-Meet) — automated + manual import

### A1. Create session (admin)

**UI:** `FFCS/src/app/admin/attendance/new/page.tsx` (new) — form mirrors `trackit/apps/web/src/app/(application)/(protected)/dashboard/in-person/new/page.tsx:26` but for Meet.

Fields: `title*`, `meetLink*` (extract `meetCode` via `trackit/src/lib/utils/format.ts:84 extractMeetCodeFromLink` regex `https://meet.google.com/(.*)`), `date` (default today), `categorySlug*` (from `GET /api/categories`), `points per attendance` (default 10).

`POST /api/attendance/session` (`ADMIN`):
```json
{ "title":"FFCS Week 3 Meet", "type":"MEET", "meetCode":"abc-defg-hij", "meetLink":"https://meet.google.com/abc-defg-hij", "categorySlug":"event", "points":10, "date":"2026-09-04T10:00:00Z" }
```
Creates `AttendanceSession {type:MEET, status:OPEN}`.

### A2. Capture — two paths

**Path 1 — Extension (preferred):**
1. Admin joins `meet.google.com/abc-defg-hij` with extension installed.
2. `ffcs-extension/attendance.js` (fork of `trackit/apps/browser-extension/attendance.js:23`) polls `document.querySelectorAll('.m3Uzve.RJRKn [role="listitem"][data-participant-id]')` every 1s, keeps `attendanceData Map<avatarUrl, {rawName, cleanName, registerNo, joinTime, attendedDuration}>` where `rawName = .zWGUib textContent` + `registerNo = parseMeetName(rawName).registerNo`.
3. On tab close / `stop()` (`attendance.js:73`) builds `participants[]` with `leaveTime`, then `fetch POST /api/attendance/meet` with JWT (new vs Trackit's `chrome.storage.local → localStorage` bridge).
4. Backend upserts `AttendanceRecord` per participant: `rawName`, `cleanName`, `registerNo`, `email` (lowercased from Meet if available), `joinTime`, `leaveTime`, `attendedDuration`, `isPresent = attendedDuration / meetDuration > 0.5` (threshold configurable).

**Path 2 — Import Google's CSV:**
Google Meet → `Attendance` panel → Download CSV. Admin drops file in `/admin/attendance/[id]/import` (`papaparse` `header:true` same as `trackit/apps/web/src/app/(application)/(protected)/dashboard/in-person/new/upload-csv.tsx:5`).

Expected headers: `Name, Email, Duration, ...` but VIT's `Name` contains `RegNo`. Backend re-parses each row via `parseMeetName` → same upsert.

Dedup: extension + import may overlap — `@@unique([sessionId, registerNo])` wins, keep max `attendedDuration`.

### A3. Compare vs FFCS master

`GET /api/attendance/session/:id/compare` returns diff:

```json
{
  "present": [{ "registerNo":"25BCE1565","name":"Raj Mishra","school":"SCOPE","email":"raj.mishra2025@vitstudent.ac.in","attendedDuration":3200,"isToastmaster":false }],
  "absent":  [{ "registerNo":"25BDS1237","name":"Jeethesh R",... }],
  "unknown": [{ "rawName":"External Guest","registerNo":null, "email":"guest@gmail.com" }]
}
```

Logic:
- `present` = `AttendanceRecord.isPresent=true` + matched `MemberProfile` by `registerNo`.
- `absent` = `MemberProfile` where `registerNo NOT IN (present registerNos)` filtered by optional `programme/school/club` query params.
- `unknown` = `AttendanceRecord.userId=null` (no RegNo match, no email match).

**UI:** `FFCS/src/app/admin/attendance/[id]/page.tsx` three tabs with `LeaderboardTable`-style list (reuse `src/components/LeaderboardTable.tsx` pattern), search, `Programme/School/Club` filter, counts, CSV export (client `json-to-csv-export` like `trackit/.../download.tsx:37`).

### A4. Award points

One-click `Award +{points} {category} to {present.length} present` → `POST /api/admin/award-bulk`:
```json
{ "sessionId":"...", "categorySlug":"event", "amount":10, "reason":"Attended FFCS Week 3 Meet", "where":"Google Meet abc-defg-hij", "how":"Auto-tracked via extension" }
```
Backend transaction: for each `present` → `prisma.point.create({recipientId, awardedById, amount, reason, where, how, categoryId, metadata:{sessionId, meetCode}})` + `user.totalPoints.increment`. Rate-limited `awardLimiter` (already `src/index.ts:62`).

Shows `PointsTimeline` update instantly.

---

## Flow B: In-Person (Out-of-Meet) — QR

Mirrors Trackit `apps/web/src/app/(application)/(public)/in-person/[slug]` + `dashboard/in-person/scan`.

### B1. Create in-person link

`POST /api/attendance/in-person` (`ADMIN`):
```json
{ "title":"Toastmasters Session 12", "venue":"Auditorium", "date":"2026-09-05T09:00:00Z", "startTime":"09:00", "allowedEmailDomains":["vitstudent.ac.in"], "allowedEmails":[], "categorySlug":"workshop", "points":15 }
```
Creates `AttendanceSession {type:IN_PERSON}` + `InPersonEvent {slug: nanoid 6, e.g. 15e2b1}` (Trackit used `gen_random_uuid()` then slug; FFCS uses `cuid` short). Returns share URL `${FRONTEND_URL}/in-person/${slug}` (`FFCS/src/app/in-person/[slug]/page.tsx` public).

### B2. Attendee registers → QR

Public page `FFCS/src/app/in-person/[slug]/page.tsx` (client-side fetch to keep export static):
- Fetch `GET /api/attendance/in-person/:slug` → `{title, venue, date, isOpen}`.
- If no token → show `Login` (`src/app/login/page.tsx`).
- If logged in but `registerNo` missing → prompt `Complete profile: Register No`.
- `POST /api/attendance/in-person/:slug/register` → creates `AttendanceRecord {source:QR_SCAN, registrationTime:now}` + `InPersonAttendee` (kept for compatibility). Returns QR data `JSON.stringify({eventId, userId})` rendered via `next-qrcode` `useQRCode` (`trackit/apps/web/src/app/(application)/(public)/in-person/[slug]/qr.tsx:18`).

Allowed domain check reused: `allowedEmailDomains.some(d => email.split("@")[1]===d)` (`trackit/action.tsx:40`).

### B3. Organizer scans

`FFCS/src/app/admin/attendance/scan/page.tsx` (copy of `trackit/.../scan/page.tsx:75 QrReader` + `mic-check` permission handling):
- `QrReader onResult -> JSON.parse(text) as {eventId,userId}` → `POST /api/attendance/in-person/:slug/checkin {userId, checkInTime: new Date().toISOString()}`.
- Backend checks `requireRole ADMIN`, `event.status OPEN`, dedup `InPersonAttendee.checkInTime already set` → `400 "already checked in"` (Trackit `index.ts:192`).
- Updates `AttendanceRecord.checkInTime` + `isPresent=true`.

Queue: if offline, store in `localStorage ffcs_scan_queue` and sync on reconnect (improvement over Trackit's no-offline).

### B4. Compare & award

Same `GET /api/attendance/session/:id/compare` — now `present` = `checkInTime != null`, `registeredNotCheckedIn` = `registrationTime != null && checkInTime == null`.

Award flow identical to A4 but `where: venue`, `how: "QR scanned"`.

---

## Flow C: Combined attendance & points

Single session view works for both types. Admin can filter leaderboard by `categorySlug` or `sessionId` to see points origin. `Point.metadata.sessionId` enables audit: `GET /api/points/me?sessionId=...` shows which session earned which points.

CSV exports (both flows) reuse `trackit/apps/web/src/app/(application)/(protected)/dashboard/in-person/[slug]/download.tsx:36 csvDownload` + `jspdf` helpers but now via `FFCS` `View` components (`src/lib/ui.ts`).

---

## Thresholds & scoring rules (admin-editable later)

- **Meet:** `isPresent = attendedDuration / (endTime - startTime) >= 0.5` (50% duration) or `>= 30 min` whichever. Config stored in `AttendanceSession.metadata.threshold`.
- **In-person:** `isPresent = checkInTime != null`. Optionally `registrationTime` alone = `0.5× points` (partial).
- **Bulk award idempotency:** `Point.metadata.sessionId + recipientId` unique — re-awarding same session is blocked unless `force=true` (deletes old points then re-awards).

Next: `04-desktop-browser-packaging.md` — how admins get this in one install.
