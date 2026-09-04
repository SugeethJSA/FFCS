"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert, Badge, OptionPicker, Textarea } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NewAttendancePage(){
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [type, setType] = useState<"IN_PERSON"|"MEET">("IN_PERSON");
  const [form, setForm] = useState({ title:"", venue:"", meetLink:"", date:"", startTime:"", allowedDomains:"vitstudent.ac.in", allowedEmails:"", categorySlug:"", points:"10" });
  const [error,setError]=useState(""); const [result,setResult]=useState<any>(null); const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{ if(!authLoading && (!user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))) router.replace("/dashboard") },[user,authLoading,router]);
  useEffect(()=>{ apiFetch("/api/categories").then(r=>r.json()).then(j=>{ if(j.success) setCats(j.data)}).catch(()=>{}) },[]);

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault(); setSubmitting(true); setError(""); setResult(null);
    try{
      const payload:any = {
        title: form.title.trim(),
        venue: form.venue.trim()||undefined,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        startTime: form.startTime ? new Date(form.startTime).toISOString() : new Date().toISOString(),
        categorySlug: form.categorySlug||undefined,
        points: form.points? Number(form.points):undefined,
      };
      let url = "";
      if(type==="IN_PERSON"){
        payload.allowedEmailDomains = form.allowedDomains.split(",").map(s=>s.trim()).filter(Boolean);
        payload.allowedEmails = form.allowedEmails.split(",").map(s=>s.trim()).filter(Boolean);
        url="/api/attendance/in-person";
      } else {
        payload.meetLink = form.meetLink.trim()||undefined;
        url="/api/attendance/meet";
      }
      const res = await apiFetch(url, { method:"POST", body: JSON.stringify(payload)});
      const j = await res.json();
      if(!res.ok) throw new Error(typeof j.error==="string"? j.error: JSON.stringify(j.error)||j.message);
      setResult(j.data);
      // redirect to detail after 1s
      const sessionId = j.data.session?.id;
      if(sessionId) setTimeout(()=>router.push(`/admin/attendance/${sessionId}`), 800);
    }catch(err:any){ setError(err.message||"Failed") } finally{ setSubmitting(false)}
  };

  if(authLoading || !user || (user.role!=="ADMIN" && user.role!=="SUPER_ADMIN"))
    return <View className="min-h-screen flex flex-col bg-background"><Navbar/><View className="p-8 text-center"><Text className="text-sm text-muted-foreground">Checking permissions…</Text></View></View>;

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar/>
      <View className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <View>
          <Text className="text-2xl font-black tracking-tight">New Attendance Session</Text>
          <Text className="text-sm text-muted-foreground">Create In-Person QR link or Google Meet session. Share link, capture attendance, compare vs FFCS master.</Text>
        </View>

        <View className="flex flex-row gap-2">
          <Button size="sm" variant={type==="IN_PERSON"?"secondary":"ghost"} onClick={()=>setType("IN_PERSON")}>In-Person QR</Button>
          <Button size="sm" variant={type==="MEET"?"secondary":"ghost"} onClick={()=>setType("MEET")}>Google Meet</Button>
        </View>

        <Card>
          <CardContent className="p-6 space-y-4">
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            {result && (
              <Alert variant="success">
                <Text className="text-sm font-semibold">Created! {result.session?.title}</Text>
                {result.event?.slug && <Text className="text-sm">Share: {typeof window!=="undefined"? window.location.origin:""}/in-person/{result.event.slug}</Text>}
                <Text className="text-xs">Redirecting…</Text>
              </Alert>
            )}
            <form onSubmit={submit} className="space-y-4">
              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Title *</Label>
                <Input required value={form.title} onChange={(e:any)=>setForm({...form,title:e.target.value})} placeholder={type==="IN_PERSON"?"Toastmasters Session 12":"FFCS Week 3 Meet"}/>
              </View>

              {type==="IN_PERSON" ? (
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Venue</Label>
                  <Input value={form.venue} onChange={(e:any)=>setForm({...form,venue:e.target.value})} placeholder="Auditorium, VIT Chennai"/>
                </View>
              ) : (
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Meet Link</Label>
                  <Input type="url" value={form.meetLink} onChange={(e:any)=>setForm({...form,meetLink:e.target.value})} placeholder="https://meet.google.com/abc-defg-hij"/>
                </View>
              )}

              <View className="grid gap-4 sm:grid-cols-2">
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Date *</Label>
                  <Input required type="datetime-local" value={form.date} onChange={(e:any)=>setForm({...form,date:e.target.value})}/>
                </View>
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Start Time *</Label>
                  <Input required type="datetime-local" value={form.startTime} onChange={(e:any)=>setForm({...form,startTime:e.target.value})}/>
                </View>
              </View>

              {type==="IN_PERSON" && (
                <>
                  <View className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Allowed Email Domains (comma)</Label>
                    <Input value={form.allowedDomains} onChange={(e:any)=>setForm({...form,allowedDomains:e.target.value})} placeholder="vitstudent.ac.in"/>
                  </View>
                  <View className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Allowed Emails (comma, optional)</Label>
                    <Textarea value={form.allowedEmails} onChange={(e:any)=>setForm({...form,allowedEmails:e.target.value})} placeholder="raj.m...@vitstudent.ac.in, ..."/>
                  </View>
                </>
              )}

              <View className="grid gap-4 sm:grid-cols-2">
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Category</Label>
                  <OptionPicker value={form.categorySlug} onChange={(v)=>setForm({...form,categorySlug:v})} options={cats.map(c=>({value:c.slug,label:c.name}))}/>
                </View>
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Points per attendance</Label>
                  <Input type="number" min={1} max={1000} value={form.points} onChange={(e:any)=>setForm({...form,points:e.target.value})}/>
                </View>
              </View>

              <Button type="submit" disabled={submitting} className="w-full">{submitting?"Creating…":"Create Session"}</Button>
            </form>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
