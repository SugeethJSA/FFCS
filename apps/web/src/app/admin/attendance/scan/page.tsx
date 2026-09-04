"use client";
import { useEffect, useRef, useState } from "react";
import { View, Text, Card, CardContent, Button, Alert, Badge, Input, Label } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ScanPage(){
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [slug,setSlug]=useState("");
  const [events,setEvents]=useState<any[]>([]);
  const [scanInput,setScanInput]=useState("");
  const [result,setResult]=useState(""); const [error,setError]=useState("");
  const [scanning,setScanning]=useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(()=>{ if(!authLoading && (!user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))) router.replace("/dashboard") },[user,authLoading,router]);
  useEffect(()=>{
    if(!user) return;
    apiFetch("/api/attendance/in-person").then(r=>r.json()).then(j=>{ if(j.success) setEvents(j.data)}).catch(()=>{});
  },[user]);

  const doCheckin = async (payload: { userId:string, eventId?:string, slug?:string })=>{
    setError(""); setResult("");
    try{
      // payload from QR is {eventId, userId} or {userId, slug} – we normalize to slug
      let targetSlug = slug;
      if(payload.slug) targetSlug = payload.slug;
      // if eventId given, find slug
      if(!targetSlug && payload.eventId){
        const ev = events.find(e=>e.id===payload.eventId);
        if(ev) targetSlug = ev.slug;
      }
      if(!targetSlug) throw new Error("Select an In-Person event first");
      const res = await apiFetch(`/api/attendance/in-person/${targetSlug}/checkin`, { method:"POST", body: JSON.stringify({ userId: payload.userId })});
      const j = await res.json();
      if(!res.ok) throw new Error(typeof j.error==="string"? j.error: JSON.stringify(j.error));
      setResult(`Checked in ${payload.userId} to ${targetSlug}`);
    }catch(e:any){ setError(e.message)}
  };

  const handleManual = async (e:React.FormEvent)=>{
    e.preventDefault();
    try{
      const obj = JSON.parse(scanInput.trim());
      await doCheckin(obj);
    }catch{
      // try as plain userId
      if(scanInput.trim()) await doCheckin({ userId: scanInput.trim() });
    }
  };

  // Html5Qrcode scanner (lazy load)
  const startScanner = async()=>{
    setError(""); setResult("");
    setScanning(true);
    try{
      const { Html5Qrcode } = await import("html5-qrcode");
      const id = "ffcs-qr-reader";
      let el = document.getElementById(id);
      if(!el){
        el = document.createElement("div"); el.id=id; document.getElementById("qr-container")?.appendChild(el);
      }
      const h = new Html5Qrcode(id);
      scannerRef.current = h;
      await h.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded)=>{
          try{ const obj = JSON.parse(decoded); await doCheckin(obj); } catch{ await doCheckin({ userId: decoded }); }
        },
        ()=>{}
      );
    }catch(e:any){ setError(e.message||"Scanner failed – use manual input"); setScanning(false)}
  };
  const stopScanner = async()=>{
    try{ await scannerRef.current?.stop(); await scannerRef.current?.clear(); }catch{} setScanning(false);
  };

  if(authLoading || !user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))
    return <View className="min-h-screen flex flex-col bg-background"><Navbar/><View className="p-8 text-center"><Text className="text-sm text-muted-foreground">Checking permissions…</Text></View></View>;

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar/>
      <View className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <View>
          <Text className="text-2xl font-black">Scan QR — Check In</Text>
          <Text className="text-sm text-muted-foreground">Camera scans attendee QR from /in-person/[slug] (payload {"{eventId,userId}"}). ADMIN only.</Text>
        </View>

        <Card>
          <CardContent className="p-6 space-y-4">
            <View className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">In-Person Event *</Label>
              <select value={slug} onChange={(e)=>setSlug(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select event</option>
                {events.map((e:any)=><option key={e.slug} value={e.slug}>{e.title} — /in-person/{e.slug} ({e._count?.attendees?? e.present??0} present)</option>)}
              </select>
              {!events.length && <Text className="text-xs text-muted-foreground">No in-person events — create one at /admin/attendance/new</Text>}
            </View>

            {error && <Alert variant="error"><Text className="text-sm">{error}</Text></Alert>}
            {result && <Alert variant="success"><Text className="text-sm">{result}</Text></Alert>}

            <View className="grid gap-4 sm:grid-cols-2">
              <View className="space-y-2">
                <Text className="text-sm font-bold">Camera</Text>
                <View id="qr-container" className="rounded border border-border bg-black/5 min-h-[280px] flex items-center justify-center overflow-hidden">
                  {!scanning && <Text className="text-xs text-muted-foreground p-4 text-center">Click Start to allow camera. If blocked, use manual input.</Text>}
                </View>
                <View className="flex flex-row gap-2">
                  {!scanning ? <Button size="sm" onClick={startScanner} disabled={!slug}>Start Scanner</Button> : <Button size="sm" variant="outline" onClick={stopScanner}>Stop</Button>}
                </View>
              </View>

              <View className="space-y-3">
                <Text className="text-sm font-bold">Manual (paste QR JSON)</Text>
                <Text className="text-xs text-muted-foreground">QR contains: {"{"}"eventId":"...","userId":"..."{"}"} — you can paste that or just the userId.</Text>
                <form onSubmit={handleManual} className="space-y-3">
                  <Input value={scanInput} onChange={(e:any)=>setScanInput(e.target.value)} placeholder='{"eventId":"...","userId":"..."}' />
                  <Button type="submit" size="sm" className="w-full" disabled={!slug}>Check In</Button>
                </form>
                <Text className="text-xs text-muted-foreground">Queue: if offline, {`scan will be retried on reconnect (coming soon)`}.</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardContent className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flow</Text>
            <Text className="text-xs text-muted-foreground mt-1">Attendee opens /in-person/[slug] → Register → sees QR → you scan here → AttendanceRecord.checkInTime set → appears in /admin/attendance/[id] Present.</Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
