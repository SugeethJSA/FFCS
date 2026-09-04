"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Button, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Skeleton, Alert } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import MeetImportBridge from "@/components/MeetImportBridge";

export default function AttendanceListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL"|"MEET"|"IN_PERSON">("ALL");

  useEffect(()=>{ if(!authLoading && (!user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))) router.replace("/dashboard") },[user,authLoading,router]);

  const load = async ()=>{
    setLoading(true);
    try{
      const q = filter==="ALL" ? "" : `?type=${filter}`;
      const res = await apiFetch(`/api/attendance/sessions${q}`);
      const j = await res.json();
      if(j.success) setSessions(j.data.sessions);
    }catch{} finally{setLoading(false)}
  };
  useEffect(()=>{ if(user) load() },[user, filter]);

  if(authLoading || !user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))
    return <View className="min-h-screen flex flex-col bg-background"><Navbar/><View className="p-8 text-center"><Text className="text-sm text-muted-foreground">Checking permissions…</Text></View></View>;

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar/>
      <View className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        <View className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <View>
            <Text className="text-2xl font-black tracking-tight">Attendance</Text>
            <Text className="text-sm text-muted-foreground">Track Google Meet + In-Person attendance, compare vs FFCS master, award points.</Text>
          </View>
          <View className="flex flex-row gap-2">
            <Button variant="outline" size="sm" onClick={()=>router.push("/admin/import")}>Import FFCS List</Button>
            <Button size="sm" onClick={()=>router.push("/admin/attendance/new")}>+ New Session</Button>
            <Button variant="secondary" size="sm" onClick={()=>router.push("/admin/attendance/scan")}>Scan QR</Button>
          </View>
        </View>

        <MeetImportBridge />

        <View className="flex flex-row gap-2">
          {(["ALL","IN_PERSON","MEET"] as const).map(f=>(
            <Button key={f} size="sm" variant={filter===f?"secondary":"ghost"} onClick={()=>setFilter(f)}>{f==="ALL"?"All":f==="IN_PERSON"?"In-Person":"Meet"}</Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
        </View>

        <Card>
          <CardContent className="p-0 overflow-auto">
            {loading ? <View className="p-6 space-y-2"><Skeleton className="h-8 w-full"/><Skeleton className="h-8 w-full"/><Skeleton className="h-8 w-full"/></View> : sessions.length===0 ? (
              <View className="p-8 text-center space-y-2">
                <Text className="text-sm font-semibold">No sessions yet</Text>
                <Text className="text-xs text-muted-foreground">Create your first In-Person link or Meet session.</Text>
                <Button size="sm" onClick={()=>router.push("/admin/attendance/new")}>Create Session</Button>
              </View>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s:any)=>(
                    <TableRow key={s.id}>
                      <TableCell>
                        <Text className="text-sm font-medium">{s.title}</Text>
                        <Text className="text-xs text-muted-foreground">{s.venue||s.meetLink||s.meetCode||""} {s.inPersonEvent?.slug ? `· /in-person/${s.inPersonEvent.slug}` : ""}</Text>
                      </TableCell>
                      <TableCell><Badge size="sm" variant={s.type==="IN_PERSON"?"info":"default"}>{s.type}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(s.date).toLocaleDateString()} {s.startTime? new Date(s.startTime).toLocaleTimeString(): ""}</TableCell>
                      <TableCell><Badge size="sm" variant={s.status==="OPEN"?"info":"default"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-xs">{s.presentCount}/{s.totalCount} {s.category?.name? `· ${s.category.name}`:""}</TableCell>
                      <TableCell>
                        <View className="flex flex-row gap-1">
                          <Button size="sm" variant="outline" onClick={()=>router.push(`/admin/attendance/${s.id}`)}>View</Button>
                          {s.inPersonEvent?.slug && <Button size="sm" variant="ghost" onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/in-person/${s.inPersonEvent.slug}`);}}>Copy Link</Button>}
                        </View>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardContent className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How it works</Text>
            <Text className="text-xs text-muted-foreground mt-1 leading-relaxed">1) Create session (Meet link or In-Person venue with allowed vitstudent domains). 2) Share /in-person/[slug] or capture Meet via extension. 3) Scan QRs or import Google CSV. 4) Compare vs FFCS master (Register No) → Award points → Leaderboard updates.</Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
