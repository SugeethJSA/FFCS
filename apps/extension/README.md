# FFCS Track Extension

Forked from `trackit/apps/browser-extension` — retargeted to FFCS.

## What it does
- On `meet.google.com/*` polls participants every 1s (`attendance.js`), extracts `rawName` + `Register No` via `/\b\d{2}[A-Z]{2,5}\d{3,4}\b/` (last token), tracks `joinTime`/`leaveTime`/`attendedDuration`.
- Shows `🔴 FFCS Tracking` + `Stop & Upload` in Meet bar (like Trackit) — clicking `Stop` posts to `POST /api/attendance/meet` with JWT or queues to `chrome.storage.local`.
- On `http://localhost:3004/*` (or `ffcs.club`) `save.js` bridges `chrome.storage.local` → `localStorage` + tries direct API, syncs `ffcs_access` token.

## Install (dev, unpacked)
1. `chrome://extensions` → Developer mode → Load unpacked → select `FFCS/ffcs-extension`
2. Login at `http://localhost:3004/login` as `ADMIN` — tokens auto-sync to `chrome.storage.local` (`ffcs_access`).
3. Join a Meet → see `🔴 FFCS Tracking` → Stop → check `http://localhost:3004/admin/attendance`.

## Config
- `localStorage.ffcs_api_base` (default `http://localhost:4000`) — set in DevTools if backend elsewhere.
- `localStorage.ffcs_frontend_base` (default `http://localhost:3004`).

## Selectors
Falls back through `'.m3Uzve.RJRKn [role="listitem"][data-participant-id]'` etc. — update `attendance.js:SELECTORS` if Google changes DOM.

## Publish
Zip `ffcs-extension/` (exclude `.bak`) → Chrome Web Store.
