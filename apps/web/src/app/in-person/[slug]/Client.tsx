"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Button, Alert, Badge, Skeleton } from "@/lib/ui";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function InPersonPublicPage(){
  const params = useParams() as {slug:string};
  const rawSlug = params.slug;
  const slug = rawSlug && rawSlug !== "placeholder" ? rawSlug : (typeof window !== "undefined" ? window.location.pathname.split("/").pop()?.split("?")[0] || "" : "");
  const router = useRouter();
  const { user } = useAuth();
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [actionMsg,setActionMsg]=useState(""); const [actionErr,setActionErr]=useState(""); const [busy,setBusy]=useState(false);

  const load = async()=>{
    setLoading(true);
    try{
      const res = await apiFetch(`/api/attendance/in-person/${slug}`);
      const j = await res.json();
      if(!res.ok) throw new Error(j.error||"Not found");
      setData(j.data);
    }catch(e:any){ setActionErr(e.message)} finally{ setLoading(false)}
  };
  useEffect(()=>{ if(slug) load() },[slug]);

  const register = async()=>{
    setBusy(true); setActionErr(""); setActionMsg("");
    try{
      const res = await apiFetch(`/api/attendance/in-person/${slug}/register`, { method:"POST" });
      const j = await res.json();
      if(!res.ok) throw new Error(typeof j.error==="string"? j.error: JSON.stringify(j.error));
      setActionMsg(j.message||"Registered! Your QR is below.");
      load();
    }catch(e:any){ setActionErr(e.message)} finally{ setBusy(false)}
  };

  if(loading) return <View className="min-h-screen flex items-center justify-center p-8"><Skeleton className="h-32 w-full max-w-lg"/></View>;
  if(!data) return <View className="min-h-screen flex flex-col items-center justify-center p-8 gap-3"><Text className="text-lg font-bold">Event not found</Text>{actionErr && <Text className="text-sm text-destructive">{actionErr}</Text>}<Button size="sm" onClick={()=>router.push("/")}>Home</Button></View>;

  const { event, myStatus } = data;
  const isClosed = event.status==="CLOSED" || !!event.endTime;
  const qrPayload = myStatus?.hasRegistered && myStatus?.userId ? JSON.stringify({ eventId: event.id, userId: myStatus.userId }) : "";

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <View className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
        <View className="flex flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center"><Text className="text-sm font-black text-primary-foreground">FFCS</Text></View>
          <Text className="text-sm font-bold">FFCS Attendance</Text>
          <Badge size="sm" variant="info" className="ml-auto">In-Person</Badge>
        </View>

        <Card variant="glass">
          <CardContent className="p-6 space-y-3">
            <Text className="text-2xl font-black">{event.title}</Text>
            <Text className="text-sm text-muted-foreground">{event.venue? `Venue: ${event.venue} · `:""}{new Date(event.date).toLocaleDateString()} {event.startTime? `· ${new Date(event.startTime).toLocaleTimeString()}`:""}</Text>
            <View className="flex flex-row gap-2">
              <Badge variant={isClosed?"default":"info"}>{isClosed?"Closed":"Open"}</Badge>
              <Badge variant="default">{event.presentCount}/{event.totalCount} registered {event.category?.name? `· ${event.category.name}`:""}</Badge>
            </View>
            {event.allowedEmailDomains?.length ? <Text className="text-xs text-muted-foreground">Allowed domains: {event.allowedEmailDomains.join(", ")}</Text>:null}
          </CardContent>
        </Card>

        {actionErr && <Alert variant="error"><Text className="text-sm">{actionErr}</Text></Alert>}
        {actionMsg && <Alert variant="success"><Text className="text-sm">{actionMsg}</Text></Alert>}

        {!user ? (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Text className="text-sm font-semibold">Login to register</Text>
              <Text className="text-xs text-muted-foreground">Use your VIT email. Name should contain Register No as last token (e.g. Raj Mishra 25BCE1565) for auto-matching.</Text>
              <View className="flex flex-row gap-2 justify-center">
                <Button size="sm" onClick={()=>router.push(`/login?next=/in-person/${slug}`)}>Log in</Button>
                <Button size="sm" variant="outline" onClick={()=>router.push(`/register?next=/in-person/${slug}`)}>Create account</Button>
              </View>
            </CardContent>
          </Card>
        ) : isClosed ? (
          <Alert variant="info"><Text className="text-sm">This event is closed. No more registrations.</Text></Alert>
        ) : myStatus?.hasCheckedIn ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Text className="text-lg font-bold text-emerald-600">✓ Checked In</Text>
              <Text className="text-sm text-muted-foreground">You were checked in at {myStatus.checkInTime? new Date(myStatus.checkInTime).toLocaleString():""}. See you there!</Text>
            </CardContent>
          </Card>
        ) : myStatus?.hasRegistered ? (
          <Card>
            <CardContent className="p-6 space-y-4 text-center">
              <Text className="text-sm font-bold">Your QR Code — show to organizer to scan</Text>
              <View className="mx-auto w-[220px] h-[220px] rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden p-2">
                {/* fallback QR via api.qrserver */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`} alt="QR" className="h-full w-full object-contain" />
              </View>
              <Text className="text-xs font-mono break-all bg-muted rounded p-2">{qrPayload}</Text>
              <Text className="text-xs text-muted-foreground">Organizer scans at /admin/attendance/scan — your checkInTime will be recorded.</Text>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4 text-center">
              <Text className="text-sm font-semibold">Register for this event</Text>
              <Text className="text-xs text-muted-foreground">Logged in as {user.displayName} ({user.email}){(user as any).registerNo? ` · ${(user as any).registerNo}`:" (no RegNo — update profile for points)"}</Text>
              <Button onClick={register} disabled={busy} className="w-full">{busy?"Registering…":"Register"}</Button>
            </CardContent>
          </Card>
        )}

        <Card variant="outline">
          <CardContent className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">For organizers</Text>
            <Text className="text-xs text-muted-foreground mt-1">Share this link: <Text className="font-mono">{typeof window!=="undefined"? window.location.href:""}</Text> · Scan at /admin/attendance/scan · View report at /admin/attendance/[id]</Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
