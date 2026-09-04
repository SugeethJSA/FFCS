// FFCS Track - bridge chrome.storage -> frontend localStorage + direct API
// Matches FFCS frontend origin (localhost:3004 and ffcs.club) - mirrors Trackit save.js

chrome.storage.local.get(null, async function (items) {
  const API_BASE = localStorage.getItem("ffcs_api_base") || "http://localhost:4000";
  const frontendBase = localStorage.getItem("ffcs_frontend_base") || "http://localhost:3004";
  // Try get token
  let token = localStorage.getItem("ffcs_access");
  if (!token) {
    const s = await new Promise((r) => chrome.storage.local.get(["ffcs_access"], r));
    token = s.ffcs_access;
  }

  for (let key in items) {
    if (!key.startsWith("meet_attendance_report_")) continue;
    const val = items[key];
    if (!val) continue;

    // Sync token/api base to chrome.storage for attendance.js
    try {
      const ffcsAccess = localStorage.getItem("ffcs_access");
      if (ffcsAccess) chrome.storage.local.set({ ffcs_access: ffcsAccess, ffcs_api_base: API_BASE, ffcs_frontend_base: frontendBase });
    } catch {}

    // Try direct POST if token exists
    if (token && val.participants) {
      try {
        const resp = await fetch(`${API_BASE}/api/attendance/meet`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: `Meet ${val.meetCode}`,
            meetCode: val.meetCode,
            meetLink: `https://meet.google.com/${val.meetCode}`,
            date: new Date().toISOString(),
            startTime: val.startTime ? new Date().toISOString() : new Date().toISOString(),
            endTime: new Date().toISOString(),
            participants: val.participants,
          }),
        });
        if (resp.ok) {
          console.log("[FFCS] save.js direct upload ok", key);
          // keep in localStorage for manual import fallback as well
          localStorage.setItem(key, JSON.stringify(val));
          chrome.storage.local.remove(key);
          continue;
        }
      } catch (e) {
        console.warn("[FFCS] direct upload failed, fallback to localStorage", e);
      }
    }

    // Fallback: copy to localStorage for FFCS frontend upload component to pick up
    localStorage.setItem(key, JSON.stringify(val));
    chrome.storage.local.remove(key);
    console.log("[FFCS] Queued to localStorage", key);
  }

  // Also sync FFCS tokens to chrome.storage for meet page
  try {
    const access = localStorage.getItem("ffcs_access");
    const apiBase = localStorage.getItem("ffcs_api_base") || API_BASE;
    if (access) chrome.storage.local.set({ ffcs_access: access, ffcs_api_base: apiBase });
  } catch {}
});
