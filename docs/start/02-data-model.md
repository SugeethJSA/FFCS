# 02 — Data Model: FFCS Master List, RegNo Parsing, VIT Domain

## 1. Source of truth today

**FFCS-backend `prisma/schema.prisma` (SQLite dev):**
```prisma
model User { id, email @unique, username @unique, displayName, passwordHash, role MEMBER|ADMIN|SUPER_ADMIN, totalPoints, isActive }
model Category { id, name @unique, slug @unique }
model Point { id, recipientId, awardedById, amount 1..1000, reason, where, how, categoryId, metadata Json, createdAt }
model RefreshToken { tokenHash @unique, expiresAt }
```
No `registerNo`, no attendance, no club membership.

**Trackit `apps/web/prisma/schema.prisma`:**
`InPersonEvent { slug @unique, groupId, venue, allowedEmailDomains String[], allowedEmails String[], date, startTime, endTime? }`
`InPersonEventAttendee { userId, eventId, checkInTime?, registrationTime } @@unique[userId,eventId]`
`AttendanceReport { slug @unique, meetingId, membersPresence Json }` where `membersPresence = [{name, joinTime, leaveTime, avatarUrl, attendedDuration}]`
`Meeting { meetLink, meetPlatform GOOGLE_MEET, date, startTime, endTime, groupId }`

---

## 2. FFCS master list spec (user-provided)

CSV header you will upload:
```
Programme | Register No | Name | School | Email | Mob No | Toastmaster | Club
```
Example row:
```
B.Tech CSE | 25BCE1565 | Raj Mishra | SCOPE | raj.mishra2025@vitstudent.ac.in | 98xxxxxx10 | Yes | Toastmasters VIT Chennai
```

Rules:
- **Register No** is primary key `e.g. 25BCE1565, 25BDS1237, 25MIS1103, 25BLC1105, 26BLC1276` — pattern `/^\d{2}[A-Z]{2,4}\d{3,4}$/` (covers VIT Chennai 2025/2026 batches seen in trackit bug reports).
- **Email** may differ from `vitstudent.ac.in` on file vs actual login email — trust `Register No` over email for join.
- **Programme/School** used for filtering leaderboard by branch.
- **Toastmaster + Club** booleans drive category weighting (e.g., `Toastmasters` events auto-tag).

---

## 3. RegNo extraction from Meet display names

When students login via college mail, Meet shows `name = "<Display> <REGNO>"` e.g. `Jeethesh R 25BDS1237`, `Kishor Kumar A 25BCE5811`, `Maarthi P 26BLC1276` (trackit `attendance.js:9 getParticipantName` grabbed `.zWGUib` uppercased).

Parser (shared `FFCS-backend/src/utils/parseRegNo.ts` + `ffcs-extension/src/utils.ts`):

```ts
export const REGNO_RE = /\b(\d{2}[A-Z]{2,5}\d{3,4})\b/; // last token wins

export function parseMeetName(raw: string): { cleanName: string, registerNo: string | null } {
  const upper = raw.trim().toUpperCase();
  const m = upper.match(REGNO_RE);
  if (!m) return { cleanName: raw.trim(), registerNo: null };
  const reg = m[1];
  const clean = raw.slice(0, raw.toUpperCase().lastIndexOf(reg)).trim().replace(/\s{2,}/g,' ');
  return { cleanName: clean || raw.replace(reg,'').trim(), registerNo: reg };
}
// "Jeethesh R 25BDS1237" -> {cleanName:"Jeethesh R", registerNo:"25BDS1237"}
// "Adithi" -> {cleanName:"Adithi", registerNo:null}
// "RAJ MISHRA 25BCE1565" -> {cleanName:"RAJ MISHRA", registerNo:"25BCE1565"}
```

Edge cases:
- Extra spaces, lowercase `25bce1565` → uppercased.
- Multiple tokens like `Vatsalya Patidar 25BLC1105` → last token only.
- No RegNo → keep `cleanName` whole, match later by email fallback.

---

## 4. Target Prisma schema (additions)

Keep SQLite + Postgres dual via `schema.prisma` + `schema.postgres.prisma` pattern already used. New file `prisma/schema.prisma` additions:

```prisma
// extend User with FFCS fields
model User {
  // existing ...
  registerNo   String?  @unique  // e.g. 25BCE1565
  vitEmail     String?  @unique  // canonical vitstudent.ac.in
  school       String?            // SCOPE, SENSE etc.
  programme    String?            // B.Tech CSE
  mobile       String?
  isToastmaster Boolean @default(false)
  club         String?            // "Toastmasters VIT Chennai" | "FFCS" | null
  // relations
  memberProfile MemberProfile?
  attendanceRecords AttendanceRecord[]
  inPersonAttendees InPersonAttendee[]
}

model MemberProfile {
  id          String @id @default(cuid())
  userId      String @unique
  user        User   @relation(fields:[userId], references:[id], onDelete: Cascade)
  // snapshot of master list import
  programme   String
  registerNo  String @unique
  name        String
  school      String
  email       String
  mobile      String?
  isToastmaster Boolean
  club        String?
  importBatchId String?
  importBatch MemberImportBatch? @relation(fields:[importBatchId], references:[id])
  updatedAt   DateTime @updatedAt
}

model MemberImportBatch {
  id        String @id @default(cuid())
  fileName  String
  rowCount  Int
  createdById String
  createdBy User @relation(fields:[createdById], references:[id])
  createdAt DateTime @default(now())
  profiles  MemberProfile[]
}

model AttendanceSession {
  id          String @id @default(cuid())
  title       String                 // "Google Meet 12 Sep" or "Auditorium Workshop"
  type        String // "MEET" | "IN_PERSON"
  meetCode    String?                // abc-defg-hij
  meetLink    String?
  venue       String?
  date        DateTime
  startTime   DateTime
  endTime     DateTime?
  createdById String
  createdBy   User @relation(fields:[createdById], references:[id])
  allowedEmailDomains String? // JSON stringified array for in-person
  allowedEmails String?       // JSON stringified array
  status      String @default("OPEN") // OPEN | CLOSED
  createdAt   DateTime @default(now())
  records     AttendanceRecord[]
  inPersonEvent InPersonEvent? // link if in-person
}

model AttendanceRecord {
  id          String @id @default(cuid())
  sessionId   String
  session     AttendanceSession @relation(fields:[sessionId], references:[id], onDelete: Cascade)
  userId      String?            // linked if matched to known user/member
  user        User? @relation(fields:[userId], references:[id])
  rawName     String             // exactly as seen in Meet / QR
  cleanName   String?
  registerNo  String?            // parsed
  email       String?            // avatar-derived or QR email
  joinTime    DateTime?
  leaveTime   DateTime?
  attendedDuration Int?          // seconds (meet)
  checkInTime DateTime?          // in-person scan time
  registrationTime DateTime?     // in-person register time
  isPresent   Boolean @default(false) // computed threshold e.g. attendedDuration > 50% or checkInTime != null
  source      String // "MEET_EXTENSION" | "MEET_CSV" | "QR_SCAN" | "MANUAL"
  createdAt   DateTime @default(now())
  @@unique([sessionId, email])
  @@unique([sessionId, registerNo])
  @@index([sessionId])
}

model InPersonEvent {
  id          String @id @default(cuid()) // map from Trackit Int id
  slug        String @unique
  title       String
  sessionId   String @unique
  session     AttendanceSession @relation(fields:[sessionId], references:[id])
  venue       String?
  date        DateTime
  startTime   DateTime
  endTime     DateTime?
  allowedEmailDomains String? // JSON
  allowedEmails String?
  createdById String
  createdAt   DateTime @default(now())
  attendees   InPersonAttendee[]
}

model InPersonAttendee {
  id          String @id @default(cuid())
  eventId     String
  event       InPersonEvent @relation(fields:[eventId], references:[id], onDelete: Cascade)
  userId      String
  user        User @relation(fields:[userId], references:[id])
  checkInTime DateTime?
  registrationTime DateTime @default(now())
  @@unique([userId, eventId])
}
```

SQLite note: `String[]` not supported — store as JSON `String` (`"["vitstudent.ac.in"]"`). Postgres version uses `String[]` native.

---

## 5. Import & normalization

**`POST /api/admin/members/import` (ADMIN only):**

Request: `multipart/form-data` `file` CSV (`papaparse` header:true, same pattern as `trackit/apps/web/src/app/(application)/(protected)/dashboard/in-person/new/upload-csv.tsx:8`).

Steps:
1. Validate columns case-insensitive: `Programme|Programme`/`Register No|RegisterNo`/`Name`/`School`/`Email`/`Mob No|Mobile`/`Toastmaster`/`Club`.
2. For each row: `registerNo = row["Register No"].trim().toUpperCase()` validated `REGNO_RE`, `email = row.Email.trim().toLowerCase()`, `isToastmaster = ["yes","y","true","1"].includes(row.Toastmaster.toLowerCase())`.
3. Upsert `User` by `registerNo` (if exists) else `email`, else create placeholder `User` with `username = registerNo.toLowerCase()`, `displayName = Name`, `passwordHash = random` + `isActive=false` (forces set password on first login).
4. Upsert `MemberProfile` by `registerNo`.
5. Create `MemberImportBatch` for audit.
6. Return `{imported, updated, skipped, errors[]}`.

This mirrors Trackit's `EmailChipsInput + CSV` upload but for FFCS master.

---

## 6. Identity resolution priority

When a Meet participant `rawName="Raj Mishra 25BCE1565"` arrives, backend resolves `userId` via:

1. `registerNo` parsed → `User.findUnique({registerNo})` **highest priority** (canonical).
2. Else `email` lowercased → `User.findUnique({email})` or `vitEmail`.
3. Else `cleanName` fuzzy? Not yet — mark `userId=null`, `isPresent` true but `unmatched` → shown in `Unknown` tab for manual link.

Unmatched rows stay in `AttendanceRecord` with `userId=null` so no points awarded until admin links via `/admin/attendance/[id]` `Link to member` dropdown (searches `MemberProfile`).

Next: `03-attendance-flows.md` — step-by-step UI for in-meet vs in-person vs import.
