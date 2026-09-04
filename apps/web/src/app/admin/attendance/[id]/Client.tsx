"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Button, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Alert, Input, Label, OptionPicker } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Papa from "papaparse";

export default function AttendanceDetailPage(){
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams() as {id:string};
  const rawId = params.id;
  const id = rawId && rawId !== "placeholder" ? rawId : (typeof window !== "undefined" ? window.location.pathname.split("/").pop()?.split("?")[0] || "" : "");
  const [session,setSession]=useState<any>(null);
  const [compare,setCompare]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<"present"|"absent"|"unknown">("present");
  const [awardCat,setAwardCat]=useState("");
  const [awardAmt,setAwardAmt]=useState("10");
  const [awardReason,setAwardReason]=useState("");
  const [cats,setCats]=useState<any[]>([]);
  const [awardResult,setAwardResult]=useState("");
  const [search,setSearch]=useState("");
  const [importMsg,setImportMsg]=useState(""); const [importingCsv,setImportingCsv]=useState(false);

  useEffect(()=>{ if(!authLoading && (!user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))) router.replace("/dashboard") },[user,authLoading,router]);
  useEffect(()=>{ apiFetch("/api/categories").then(r=>r.json()).then(j=>{ if(j.success) setCats(j.data)}).catch(()=>{}) },[]);

  const load = async()=>{
    setLoading(true);
    try{
      const r = await apiFetch(`/api/attendance/session/${id}`);
      const j = await r.json();
      if(j.success) setSession(j.data.session);
      const c = await apiFetch(`/api/attendance/session/${id}/compare`);
      const cj = await c.json();
      if(cj.success) setCompare(cj.data);
    }catch{} finally{setLoading(false)}
  };
  useEffect(()=>{ if(user && id) load() },[user,id]);

  const award = async()=>{
    setAwardResult("");
    try{
      const res = await apiFetch(`/api/attendance/session/${id}/award`, { method:"POST", body: JSON.stringify({ categorySlug: awardCat||undefined, amount: Number(awardAmt), reason: awardReason||undefined })});
      const j = await res.json();
      if(!res.ok) throw new Error(typeof j.error==="string"? j.error: JSON.stringify(j.error));
      setAwardResult(`Awarded ${j.data.awarded} (skipped ${j.data.skipped}, already ${j.data.alreadyAwarded})`);
      load();
    }catch(e:any){ setAwardResult("Error: "+e.message)}
  };

  const closeSession = async()=>{
    await apiFetch(`/api/attendance/session/${id}/close`, {method:"POST"});
    load();
  };

  const handleMeetCsv = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    setImportingCsv(true); setImportMsg("");
    Papa.parse(file, {
      header:true,
      skipEmptyLines:true,
      complete: async (res)=>{
        try{
          const rows = res.data as any[];
          const resp = await apiFetch(`/api/attendance/meet/${id}/import-csv`, { method:"POST", body: JSON.stringify({ rows })});
          const j = await resp.json();
          if(!resp.ok) throw new Error(typeof j.error==="string"? j.error: JSON.stringify(j.error));
          setImportMsg(`Imported ${j.data.imported} rows from Google Meet CSV`);
          load();
        }catch(err:any){ setImportMsg("Import failed: "+err.message)} finally{ setImportingCsv(false); (e.target as HTMLInputElement).value=""}
      },
      error: (err)=>{ setImportMsg("Parse failed: "+err.message); setImportingCsv(false)}
    });
  };

  const exportCsv = (rows:any[], filename:string)=>{
    const header = ["Participant Name","Register No","Email","Status","Source"];
    const csv = [header.join(",")].concat(rows.map((r:any)=>[
      `"${(r.name||r.cleanName||r.rawName||"").replace(/"/g,'""')}"`,
      `"${r.registerNo||""}"`,
      `"${r.email||""}"`,
      `"${r.isPresent?"Present":"Absent"}"`,
      `"${r.source||""}"`,
    ].join(","))).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  };

  if(authLoading) return <View className="min-h-screen flex flex-col bg-background"><Navbar/><View className="p-8 text-center"><Text className="text-sm text-muted-foreground">Loading…</Text></View></View>;

  const present = compare?.present||[];
  const absent = compare?.absent||[];
  const unknown = compare?.unknown||[];
  const filtered = (arr:any[])=> arr.filter((r:any)=>{
    if(!search) return true;
    const s=search.toLowerCase();
    return (r.name||r.rawName||"").toLowerCase().includes(s) || (r.registerNo||"").toLowerCase().includes(s) || (r.email||"").toLowerCase().includes(s);
  });

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar/>
      <View className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={()=>router.push("/admin/attendance")}>← Back to list</Button>
        {loading ? <Text className="text-sm text-muted-foreground">Loading session…</Text> : session && (
          <>
            <Card>
              <CardContent className="p-6 space-y-3">
                <View className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <View>
                    <Text className="text-xl font-black">{session.title}</Text>
                    <Text className="text-sm text-muted-foreground">{session.type} · {new Date(session.date).toLocaleString()} {session.venue? `· ${session.venue}`:""} {session.meetLink? `· ${session.meetLink}`:""}</Text>
                    <View className="flex flex-row gap-2 mt-2">
                      <Badge>{session.status}</Badge>
                      <Badge variant="info">{session.type}</Badge>
                      {session.category && <Badge variant="info">{session.category.name}</Badge>}
                      {session.points && <Badge variant="default">{session.points} pts</Badge>}
                    </View>
                  </View>
                  <View className="flex flex-col gap-2">
                    {session.inPersonEvent && <Button size="sm" variant="outline" onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/in-person/${session.inPersonEvent.slug}`)}}>Copy /in-person/{session.inPersonEvent.slug}</Button>}
                    <Button size="sm" variant="ghost" onClick={()=>router.push("/admin/attendance/scan")}>Scan QR</Button>
                    <Button size="sm" variant="secondary" onClick={closeSession} disabled={session.status==="CLOSED"}>{session.status==="CLOSED"?"Closed":"Close Session"}</Button>
                  </View>
                </View>
                <View className="flex flex-row gap-4 text-xs">
                  <Text>Total records: {compare?.counts?.totalRecords?? session.records?.length??0}</Text>
                  <Text>Present: {compare?.counts?.present??0}</Text>
                  <Text>Absent: {compare?.counts?.absent??0}</Text>
                  <Text>Unknown: {compare?.counts?.unknown??0}</Text>
                </View>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-sm font-bold">Award Points to Present</Text>
                  {awardResult && <Text className="text-xs text-muted-foreground">{awardResult}</Text>}
                </View>
                <View className="grid gap-3 sm:grid-cols-4">
                  <View className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <OptionPicker value={awardCat} onChange={setAwardCat} options={cats.map(c=>({value:c.slug,label:c.name}))}/>
                  </View>
                  <View className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input type="number" value={awardAmt} onChange={(e:any)=>setAwardAmt(e.target.value)}/>
                  </View>
                  <View className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Reason (optional)</Label>
                    <Input value={awardReason} onChange={(e:any)=>setAwardReason(e.target.value)} placeholder={`Attended ${session.title}`}/>
                  </View>
                </View>
                <Button size="sm" onClick={award} disabled={present.length===0}>Award {awardAmt} pts to {present.length} present</Button>
                <Text className="text-xs text-muted-foreground">Idempotent: already-awarded members are skipped via Point.metadata.sessionId.</Text>
              </CardContent>
            </Card>

            {session?.type==="MEET" && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Text className="text-sm font-bold">Import Google Meet CSV</Text>
                  <Text className="text-xs text-muted-foreground">Upload the CSV you downloaded from Meet (or any CSV with Name/Email columns). RegNo is parsed from Name's last token.</Text>
                  <View className="flex flex-row items-center gap-2">
                    <input type="file" accept=".csv" onChange={handleMeetCsv} disabled={importingCsv} />
                    {importingCsv && <Text className="text-xs">Importing…</Text>}
                    {importMsg && <Text className="text-xs">{importMsg}</Text>}
                  </View>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <View className="flex flex-row items-center gap-2">
                  <Button size="sm" variant={tab==="present"?"secondary":"ghost"} onClick={()=>setTab("present")}>Present ({present.length})</Button>
                  <Button size="sm" variant={tab==="absent"?"secondary":"ghost"} onClick={()=>setTab("absent")}>Absent ({absent.length})</Button>
                  <Button size="sm" variant={tab==="unknown"?"secondary":"ghost"} onClick={()=>setTab("unknown")}>Unknown ({unknown.length})</Button>
                  <Input placeholder="Search name/regno/email" value={search} onChange={(e:any)=>setSearch(e.target.value)} className="max-w-xs ml-auto"/>
                  <Button size="sm" variant="outline" onClick={()=>{
                    const rows = tab==="present"? present: tab==="absent"? absent: unknown;
                    exportCsv(filtered(rows), `ffcs-${session.title}-${tab}.csv`);
                  }}>Export CSV</Button>
                </View>

                <View className="overflow-auto rounded border border-border">
                  {tab==="present" && (
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Reg No</TableHead><TableHead>Email</TableHead><TableHead>Source</TableHead><TableHead>Link</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filtered(present).map((r:any)=>(
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{r.cleanName||r.rawName} {r.registerNo? `· ${r.registerNo}`:""}</TableCell>
                            <TableCell className="text-xs font-mono">{r.registerNo||"-"}</TableCell>
                            <TableCell className="text-xs">{r.email||"-"}</TableCell>
                            <TableCell><Badge size="sm">{r.source}</Badge></TableCell>
                            <TableCell className="text-xs">{r.userId? "Linked" : "Unlinked"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {tab==="absent" && (
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Reg No</TableHead><TableHead>School</TableHead><TableHead>Email</TableHead><TableHead>Club</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filtered(absent).map((r:any)=>(
                          <TableRow key={r.registerNo}>
                            <TableCell className="text-xs">{r.name}</TableCell>
                            <TableCell className="text-xs font-mono">{r.registerNo}</TableCell>
                            <TableCell className="text-xs">{r.school}</TableCell>
                            <TableCell className="text-xs">{r.email}</TableCell>
                            <TableCell className="text-xs">{r.club||"-"} {r.isToastmaster?"· Toast":""}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {tab==="unknown" && (
                    <Table>
                      <TableHeader><TableRow><TableHead>Raw Name</TableHead><TableHead>Reg No</TableHead><TableHead>Email</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filtered(unknown).map((r:any)=>(
                          <TableRow key={r.id||r.email}>
                            <TableCell className="text-xs">{r.rawName||r.name}</TableCell>
                            <TableCell className="text-xs">{r.registerNo||"-"}</TableCell>
                            <TableCell className="text-xs">{r.email||"-"}</TableCell>
                            <TableCell><Badge size="sm">{r.source||"unknown"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </View>
              </CardContent>
            </Card>
          </>
        )}
      </View>
    </View>
  );
}
