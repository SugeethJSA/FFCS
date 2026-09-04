# 00 — Overview: Trackit → FFCS Continuity

**Goal:** Port Trackit's proven attendance engine (Google Meet in-meet + in-person QR) into FFCS so fellow admins can `install once → iterate fast → award points accurately` against the predefined FFCS master list.

**Status:** Plan for review. No code changed yet. All docs live under `FFCS/docs/start/` — read in order `00→05`.

---

## 1. What we are merging

| Source | What it does today | FFCS gap it fills |
|---|---|---|
| **Trackit `apps/browser-extension/attendance.js`** | Polls `meet.google.com` DOM every 1s, tracks `avatarUrl → {name, joinTime, leaveTime, attendedDuration}` → `chrome.storage.local` → `save.js` → `localStorage` → `upload-attendance-report.tsx` → `saveAttendanceReport()` transaction | FFCS has **zero** meet automation. Today admins manually reconcile Meet CSVs or headcounts. |
| **Trackit `apps/web/src/app/(application)/(protected)/dashboard/in-person`** | Create link `/in-person/[slug]` with `allowedEmailDomains/allowedEmails/venue/date`, attendee `Register` → QR `JSON {eventId,userId}`, organizer `Scan` via `react-qr-reader` → `checkInToInPersonEvent` → report `attendees-table.tsx` + CSV/PDF `download.tsx` | FFCS has **no** in-person check-in. Needed for club rooms, auditorium, Toastmasters sessions. |
| **Trackit reports `apps/web/src/app/(application)/(protected)/g/[groupId]/r/[slug]`** | `membersPresence JSON` store, `AttendanceReport` + `Meeting` grouped by `Group.isDefault`, share via `sharedWith`/`isPublic`, duration calc `getDurationBetweenDates` | FFCS leaderboard already has `Point` + `Category` + `totalPoints` denormalized. We just need to bridge attendance → points. |
| **FFCS current** | Static `Next.js 16 export` (`FFCS/src`, `out/`), `AmazeUI 1.6`, `FFCS-backend` `Express 4 + Prisma 6` `SQLite` dev / `Postgres` prod, JWT `15m` + hashed refresh `7d`, `Category`/`Point`/`User`/`totalPoints` | Lacks: member import keyed on Register No, RegNo parsing from Meet display names, any attendance store, any extension/desktop wrapper. |

---

## 2. The FFCS-specific twist

**Login name format (VIT):** When students join via college mail `...@vitstudent.ac.in`, Google Meet shows `DisplayName = "<First Last> <REGNO>"` e.g. `Jeethesh R 25BDS1237`. Trackit stored this raw `name` uppercased via `.zWGUib` selector. For FFCS we must:

1. Parse `REGNO` = last token `/\b\d{2}[A-Z]{3,4}\d{3,4}\b/` (covers `25BCE1565`, `25BDS1237`, `26BLC1276`, `25MIS1103` seen in `trackit` CSV bug).
2. Join against **FFCS master list** with columns:

```
Programme | Register No | Name | School | Email | Mob No | Toastmaster (Y/N) | Club (Toastmasters / Other)
```

3. Score attendance vs list: `present / absent / unknown (not in FFCS list)` → auto-award.

**Why this matters:** Email alone is unreliable (students use personal, staff, typos). RegNo is canonical. FFCS already stores `User.username` lowercased — we will add `registerNo` unique + `vitEmail` + `school/programme` fields.

---

## 3. "Easy peesy" admin UX principles

- **Install once:** Single installer (Tauri desktop + bundled extension) or 2-click store install. No `chrome://extensions → Load unpacked` ceremony.
- **Iterate very quickly:** `pnpm dev` runs both `FFCS` + `FFCS-backend` + `extension` in one command with HMR. Admins edit scoring rules without backend deploy.
- **Works offline-ish:** QR check-in works offline (local store), syncs later. Meet capture retries if Meet DOM class names change (Trackit's brittle `.m3Uzve.RJRKn [role="listitem"]` selectors versioned).
- **Compare in one click:** `Import Meet CSV` → `Compare vs FFCS list` → `Award points` → `Leaderboard updates` (<2s).

---

## 4. What "done" looks like for v1

1. Admin uploads `ffcs-master.csv` (Programme, Register No, ...) via `/admin/import` — creates/updates `Member` profiles linked to `User`.
2. Admin goes to `/admin/attendance` → `Create Meet` (Google Meet link) or `Create In-Person` (venue) → gets shareable link + QR.
3. During meet, extension auto-captures or admin imports Google's own attendance CSV. `/admin/attendance/[id]` shows table diffed against FFCS list: `Present (scan/meet)`, `Registered but not checked-in`, `Unknown (not in list)`.
4. One button `Award +10 Event Participation to Present` → `POST /api/admin/award-bulk` → `Point` entries + `totalPoints` increments → leaderboard live.
5. Desktop app (Tauri) bundles the same extension so fellow admins install `.msi/.dmg` and get a menubar `FFCS Track` button.

Next: `01-architecture.md` for how we fit this into the static export + Express constraints without rewriting FFCS.
