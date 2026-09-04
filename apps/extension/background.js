chrome.runtime.onInstalled.addListener(function () {
  chrome.tabs.create({
    url: "http://localhost:3004/admin/attendance",
    active: true,
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "FFCS_GET_TOKEN") {
    chrome.storage.local.get(["ffcs_access"], (res) => sendResponse({ token: res.ffcs_access || null }));
    return true;
  }
});
