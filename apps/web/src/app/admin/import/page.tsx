"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Button, Alert, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Skeleton } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string[][]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [batches, setBatches] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) router.replace("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/admin/members/batches").then(r=>r.json()).then(j=>{ if(j.success) setBatches(j.data)}).catch(()=>{})
  }, [user, result]);

  const handleFile = (f: File | null) => {
    setFile(f);
    setError(""); setResult(null);
    if (!f) { setPreview([]); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      const parsed = lines.map(l => l.split(",").map(s => s.trim().replace(/^"|"$/g, "")));
      setPreview(parsed);
    };
    reader.readAsText(f.slice(0, 8192));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // need to use raw fetch to keep multipart, apiFetch will set auth header
      const token = typeof window !== "undefined" ? localStorage.getItem("ffcs_access") : null;
      const headers: Record<string,string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/,"") + "/api/admin/members/import", {
        method: "POST",
        headers,
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error) || j.message || "Import failed");
      setResult(j.data);
    } catch (err:any) {
      setError(err.message || "Import failed");
    } finally { setSubmitting(false); }
  };

  if (authLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return <View className="min-h-screen flex flex-col bg-background"><Navbar/><View className="p-8 text-center"><Text className="text-sm text-muted-foreground">Checking permissions…</Text></View></View>
  }

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar/>
      <View className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
        <View>
          <Text className="text-2xl font-black tracking-tight">FFCS Master Import</Text>
          <Text className="text-sm text-muted-foreground">Upload your predefined FFCS list (Programme, Register No, Name, School, Email, Mob No, Toastmaster, Club). Deduplicates by Register No, links to User via RegNo &amp; vitstudent email.</Text>
          <Badge variant="info" className="mt-2">Role: {user.role} · Supported: CSV ≤5MB, header row required</Badge>
        </View>

        <Card>
          <CardContent className="p-6 space-y-4">
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            {result && (
              <Alert variant="success">
                <Text className="text-sm font-semibold">Import complete — {result.fileName}</Text>
                <Text className="text-sm">Total {result.totalRows} · Imported {result.imported} · Updated {result.updated} · Skipped {result.skipped}</Text>
                {result.errors?.length ? (
                  <View className="mt-2 rounded bg-black/5 p-2 max-h-32 overflow-auto">
                    <Text className="text-xs font-mono">Errors (first 50):</Text>
                    {result.errors.map((er:any,i:number)=><Text key={i} className="text-xs font-mono">{`Row ${er.row} [${er.registerNo||"-"}]: ${er.error}`}</Text>)}
                    {result.hasMoreErrors && <Text className="text-xs">…more errors truncated</Text>}
                  </View>
                ):null}
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-4">
              <View
                onDragOver={(e:any)=>{e.preventDefault(); setDragOver(true)}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={(e:any)=>{e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f)}}
                className={`rounded-xl border-2 border-dashed p-8 text-center transition ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
              >
                <Text className="text-sm font-semibold">Drag & drop CSV here or</Text>
                <View className="mt-3">
                  <input id="ffcs-file" type="file" accept=".csv" className="hidden" onChange={(e:any)=>handleFile(e.target.files?.[0]||null)} />
                  <Button type="button" variant="outline" size="sm" onClick={()=>document.getElementById("ffcs-file")?.click()}>{file ? file.name : "Choose file"}</Button>
                </View>
                <Text className="mt-2 text-xs text-muted-foreground">Header must contain at least: Register No, Name, Email. Programme/School/Mob No/Toastmaster/Club optional but recommended.</Text>
              </View>

              {preview.length ? (
                <View>
                  <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview (first 5 rows)</Text>
                  <View className="mt-2 overflow-auto rounded border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>{preview[0].map((h,i)=><TableHead key={i} className="text-xs">{h}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.slice(1).map((row,i)=><TableRow key={i}>{row.map((c,j)=><TableCell key={j} className="text-xs">{c}</TableCell>)}</TableRow>)}
                      </TableBody>
                    </Table>
                  </View>
                </View>
              ):null}

              <Button type="submit" disabled={!file || submitting} className="w-full">{submitting ? "Importing…" : "Import FFCS list"}</Button>
              <Text className="text-xs text-muted-foreground">Parsing: last token RegNo extracted via <Text className="font-mono">RegNo pattern</Text> (e.g. 25BCE1565). Placeholder users created with <Text className="font-mono">username=regNo</Text> &amp; <Text className="font-mono">isActive=false</Text> until they set password.</Text>
            </form>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardContent className="p-4 space-y-3">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-sm font-bold">Recent imports</Text>
              <Badge variant="info" size="sm">{batches.length} batches</Badge>
            </View>
            {batches.length===0 ? <Text className="text-xs text-muted-foreground">No imports yet — upload your first FFCS CSV above.</Text> : (
              <View className="space-y-2">
                {batches.map((b:any)=><View key={b.id} className="flex flex-row items-center justify-between rounded border border-border px-3 py-2"><View><Text className="text-sm font-medium">{b.fileName}</Text><Text className="text-xs text-muted-foreground">{b.rowCount} rows · by {b.createdBy?.username||"—"} · {new Date(b.createdAt).toLocaleString()}</Text></View><Badge size="sm">{b.rowCount}</Badge></View>)}
              </View>
            )}
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardContent className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What happens on import</Text>
            <Text className="mt-1 text-xs text-muted-foreground leading-relaxed">
              1) Register No normalized upper + validated. 2) User resolved by registerNo → email → vitEmail, else placeholder created (username=regNo, isActive=false). 3) MemberProfile upsert by registerNo. 4) Batch recorded for audit. Use <Text className="font-mono">GET /api/admin/members?search=25BCE</Text> to verify. Attendance compare later joins on registerNo first, email fallback.
            </Text>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
