"use client";
import { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "@/lib/ui";
import { apiFetch } from "@/lib/api";

// Mirrors trackit/src/components/upload-attendance-report.tsx
// Checks localStorage for meet_attendance_report_* keys (from ffcs-extension save.js)
// and offers to import into FFCS as new Meet sessions.

export default function MeetImportBridge() {
  const [queued, setQueued] = useState<{ key: string; data: any }[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const scan = () => {
    const found: { key: string; data: any }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("meet_attendance_report_")) {
        try {
          const v = JSON.parse(localStorage.getItem(k) || "");
          found.push({ key: k, data: v });
        } catch {}
      }
    }
    setQueued(found);
  };

  useEffect(() => {
    scan();
    const id = setInterval(scan, 3000);
    // also sync tokens to chrome.storage for extension
    try {
      const access = localStorage.getItem("ffcs_access");
      if (access && (window as any).chrome?.storage) {
        (window as any).chrome.storage.local.set({ ffcs_access: access, ffcs_api_base: localStorage.getItem("ffcs_api_base") || "http://localhost:4000" });
      }
    } catch {}
    return () => clearInterval(id);
  }, []);

  const importOne = async (item: { key: string; data: any }) => {
    setImporting(item.key);
    setMsg("");
    try {
      const payload = {
        title: `Meet ${item.data.meetCode || "Import"}`,
        meetCode: item.data.meetCode,
        meetLink: item.data.meetCode ? `https://meet.google.com/${item.data.meetCode}` : undefined,
        date: new Date().toISOString(),
        startTime: item.data.startTime ? new Date().toISOString() : new Date().toISOString(),
        endTime: new Date().toISOString(),
      };
      const res = await apiFetch("/api/attendance/meet", { method: "POST", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error));
      const sessionId = j.data.session.id;
      // now post participants
      const pRes = await apiFetch(`/api/attendance/meet/${sessionId}/participants`, {
        method: "POST",
        body: JSON.stringify({ participants: item.data.participants }),
      });
      const pj = await pRes.json();
      if (!pRes.ok) throw new Error(JSON.stringify(pj.error || pj));
      localStorage.removeItem(item.key);
      setMsg(`Imported ${item.key} → ${pj.data.imported} participants (session ${sessionId})`);
      scan();
    } catch (e: any) {
      setMsg(`Failed ${item.key}: ${e.message}`);
    } finally {
      setImporting(null);
    }
  };

  if (!queued.length) return null;

  return (
    <Alert variant="info">
      <View className="space-y-2">
        <Text className="text-sm font-bold">FFCS Extension — {queued.length} Meet report(s) queued</Text>
        <Text className="text-xs text-muted-foreground">From ffcs-extension/save.js (chrome.storage → localStorage). Import to create sessions.</Text>
        {queued.map((q) => (
          <View key={q.key} className="flex flex-row items-center justify-between rounded bg-white p-2">
            <View>
              <Text className="text-xs font-mono">{q.key}</Text>
              <Text className="text-xs text-muted-foreground">{q.data.participants?.length || 0} participants · {q.data.meetCode} · {q.data.date}</Text>
            </View>
            <Button size="sm" disabled={!!importing} onClick={() => importOne(q)}>
              {importing === q.key ? "Importing…" : "Import"}
            </Button>
          </View>
        ))}
        {msg && <Text className="text-xs">{msg}</Text>}
      </View>
    </Alert>
  );
}
