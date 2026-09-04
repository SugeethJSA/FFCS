// FFCS Track - Google Meet Attendance (forked from Trackit attendance.js)
// Enhancements: VIT RegNo parsing, FFCS API direct POST, robust selectors, offline queue

let meetActionButtons;
let participantsList = new Map();
let attendanceData = new Map();
let participantsButtonIndex = 0;
let startTime;
let meetDuration = 1;
let tracking;
let engine;

// --- RegNo parsing (mirrors FFCS-backend/src/utils/parseRegNo.ts) ---
const REGNO_RE = /\b(\d{2}[A-Z]{2,5}\d{3,4})\b/;
function parseMeetName(raw) {
  if (!raw) return { cleanName: "", registerNo: null };
  const trimmed = String(raw).trim();
  const upper = trimmed.toUpperCase();
  const m = upper.match(REGNO_RE);
  if (!m || !m[1]) return { cleanName: trimmed, registerNo: null };
  const reg = m[1];
  const idx = upper.lastIndexOf(reg);
  const clean = (trimmed.slice(0, idx) + trimmed.slice(idx + reg.length)).trim().replace(/\s{2,}/g, " ");
  return { cleanName: clean || trimmed.replace(new RegExp(reg, "i"), "").trim(), registerNo: reg };
}

// Support multiple selector versions (Google changes classes)
const SELECTORS = [
  '.m3Uzve.RJRKn [role="listitem"][data-participant-id]',
  '[data-participant-id][role="listitem"]',
  '[data-participant-id]',
];
const NAME_SELECTORS = [".zWGUib", "[data-self-name]", "span[aria-label]"];
const AVATAR_SELECTORS = ["img.KjWwNd", "img[data-participant-avatar]", "img[src*='googleusercontent']"];

function getParticipantName(node) {
  for (const sel of NAME_SELECTORS) {
    const el = node.querySelector(sel);
    if (el && el.textContent) return el.textContent.trim();
  }
  return node.textContent?.trim().slice(0, 80) || "Unknown";
}
function getParticipantAvatar(node) {
  for (const sel of AVATAR_SELECTORS) {
    const el = node.querySelector(sel);
    if (el && el.src) return el.src;
  }
  return "no-avatar-" + Math.random().toString(36).slice(2);
}
function getMeetingParticipants() {
  for (const sel of SELECTORS) {
    const els = Array.from(document.querySelectorAll(sel));
    if (els.length) return els;
  }
  return [];
}

function track_attendance() {
  let currentParticipants = getMeetingParticipants();
  if (currentParticipants.length > 0) {
    participantsList.clear();
    if (meetDuration == 1) startTime = new Date();
    currentParticipants.forEach((node) => {
      let avatarUrl = getParticipantAvatar(node);
      let rawName = getParticipantName(node);
      participantsList.set(avatarUrl, rawName);
    });
    participantsList.forEach(function (rawName, avatarUrl) {
      const { cleanName, registerNo } = parseMeetName(rawName);
      if (attendanceData.has(avatarUrl)) {
        let data = attendanceData.get(avatarUrl);
        data.attendedDuration += 1;
        data.lastAttendedTimeStamp = new Date();
        data.registerNo = data.registerNo || registerNo;
        data.cleanName = data.cleanName || cleanName;
        attendanceData.set(avatarUrl, data);
      } else {
        let joinTime = new Date();
        let data = {
          avatarUrl: avatarUrl,
          rawName: rawName,
          name: rawName, // keep for Trackit compat
          cleanName: cleanName,
          registerNo: registerNo,
          joinTime: joinTime.getHours() + ":" + joinTime.getMinutes() + ":" + joinTime.getSeconds(),
          attendedDuration: 1,
          lastAttendedTimeStamp: new Date(),
        };
        attendanceData.set(avatarUrl, data);
      }
    });
    meetDuration += 1;
  } else {
    try {
      const btns = meetActionButtons && meetActionButtons.length ? meetActionButtons : document.getElementsByClassName("XSfT7e");
      btns[participantsButtonIndex % btns.length].click();
    } catch (error) {
      // don't auto-stop anymore - keep polling, Meet may have hidden list
    }
  }
}

function start() {
  tracking = setInterval(track_attendance, 1000);
}

let stop = async function () {
  clearInterval(tracking);
  let meetCode = window.location.pathname.substring(1).split("?")[0] || "unknown";
  let date = new Date();
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  let yyyy = date.getFullYear();
  let uuid = "meet_attendance_report_" + meetCode + dd + mm + yyyy + date.getHours() + date.getMinutes() + date.getSeconds() + date.getMilliseconds();
  date = dd + "/" + mm + "/" + yyyy;
  let stopTime = new Date();
  attendanceData.forEach(function (data) {
    data.leaveTime = data.lastAttendedTimeStamp.getHours() + ":" + data.lastAttendedTimeStamp.getMinutes() + ":" + data.lastAttendedTimeStamp.getSeconds();
  });
  var attendanceDetails = {
    meetCode: meetCode,
    date: date,
    startTime: startTime ? startTime.getHours() + ":" + startTime.getMinutes() + ":" + startTime.getSeconds() : "",
    stopTime: stopTime.getHours() + ":" + stopTime.getMinutes() + ":" + stopTime.getSeconds(),
    participants: Array.from(attendanceData.values()),
  };
  // Try direct POST to FFCS backend if logged in, else queue to storage
  const API_BASE = localStorage.getItem("ffcs_api_base") || "http://localhost:4000";
  // Try get token from FFCS frontend storage (shared domain) or chrome.storage
  let token = null;
  try {
    token = localStorage.getItem("ffcs_access");
    if (!token) {
      const stored = await new Promise((res) => chrome.storage.local.get(["ffcs_access", "ffcs_api_base"], res));
      token = stored.ffcs_access || null;
    }
  } catch {}
  if (token) {
    try {
      // attempt to find session by meetCode - if not, backend will need manual session link; we queue for manual import
      const resp = await fetch(`${API_BASE}/api/attendance/meet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `Meet ${meetCode}`,
          meetCode: meetCode,
          meetLink: `https://meet.google.com/${meetCode}`,
          date: new Date().toISOString(),
          startTime: startTime ? startTime.toISOString() : new Date().toISOString(),
          endTime: stopTime.toISOString(),
          participants: attendanceDetails.participants,
        }),
      });
      if (resp.ok) {
        console.log("[FFCS] Direct upload success");
        // also save to storage for fallback UI
      } else {
        throw new Error("upload failed " + resp.status);
      }
    } catch (e) {
      console.warn("[FFCS] Direct upload failed, queuing", e);
      queueToStorage(uuid, attendanceDetails);
    }
  } else {
    queueToStorage(uuid, attendanceDetails);
  }
  // Always open FFCS attendance import page (or queue view)
  const frontendBase = localStorage.getItem("ffcs_frontend_base") || "http://localhost:3004";
  window.open(`${frontendBase}/admin/attendance`, "_blank");
};

function queueToStorage(uuid, details) {
  let obj = {};
  obj[uuid] = details;
  chrome.storage.local.set(obj, function () {
    console.log("[FFCS] Queued to chrome.storage", uuid);
  });
}

// Status text
let statusText = document.createElement("button");
statusText.id = "ffcs-status";
statusText.className = "Jyj1Td CkXZgc";
statusText.innerHTML = "&nbsp;🔴 FFCS Tracking";
statusText.style.color = "#7c3aed";
statusText.style.fontWeight = "bold";
statusText.style.padding = "auto";
statusText.style.border = "none";
statusText.style.outline = "none";
statusText.style.background = "transparent";
statusText.title = "FFCS Track - parsing RegNo, click to stop and upload";
statusText.onclick = () => { if (confirm("Stop tracking and upload to FFCS?")) stop(); };
const blinkSpeed = 500;
setInterval(function () {
  statusText.style.visibility = statusText.style.visibility == "hidden" ? "" : "hidden";
}, blinkSpeed);

// Also add manual stop button injected next to status
let stopBtn = document.createElement("button");
stopBtn.textContent = "Stop & Upload";
stopBtn.style.cssText = "margin-left:8px;padding:4px 8px;border-radius:9999px;background:#7c3aed;color:white;font-size:12px;border:none;cursor:pointer;";
stopBtn.onclick = () => stop();

engine = setInterval(startEngine, 1000);
function startEngine() {
  try {
    meetActionButtons = document.getElementsByClassName("XSfT7e");
    const bar = document.getElementsByClassName("Qp8KI")[0] || document.querySelector('[aria-label*="meeting"]')?.parentElement;
    if (bar) {
      bar.appendChild(statusText);
      bar.appendChild(stopBtn);
      start();
      clearInterval(engine);
    }
  } catch (error) {}
}

// Expose for manual stop via console
window.FFCS_stop = stop;
