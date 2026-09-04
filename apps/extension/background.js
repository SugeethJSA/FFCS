chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(["ffcs_frontend_base"], (res) => {
    const base = res.ffcs_frontend_base || "http://localhost:3004";
    chrome.tabs.create({
      url: `${base.replace(/\/$/, "")}/admin/attendance`,
      active: true,
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "FFCS_GET_TOKEN") {
    chrome.storage.local.get(["ffcs_access"], (res) => sendResponse({ token: res.ffcs_access || null }));
    return true;
  }
});
