chrome.storage.local.get(["ffcs_frontend_base"], (res) => {
  const base = res.ffcs_frontend_base || "http://localhost:3004";
  chrome.tabs.create({ url: `${base.replace(/\/$/, "")}/admin/attendance`, active: true });
});
