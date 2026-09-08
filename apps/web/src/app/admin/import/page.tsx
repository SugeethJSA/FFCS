"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Button, Alert, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, UploadCloud, CheckCircle2, ArrowLeft, FileText, Check, AlertCircle } from "lucide-react";

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

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/admin/members/batches")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setBatches(j.data);
      })
      .catch(() => {});
  }, [user, result]);

  const handleFile = (f: File | null) => {
    setFile(f);
    setError("");
    setResult(null);
    if (!f) {
      setPreview([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      const parsed = lines.map((l) => l.split(",").map((s) => s.trim().replace(/^"|"$/g, "")));
      setPreview(parsed);
    };
    reader.readAsText(f.slice(0, 8192));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("ffcs_access") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "") + "/api/admin/members/import",
        {
          method: "POST",
          headers,
          body: fd,
        }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error) || j.message || "Import failed");
      setResult(j.data);
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="p-12 text-center"><Text className="text-sm text-muted-foreground">Checking permissions…</Text></View>
      </View>
    );
  }

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-row items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight">FFCS Master List Import</Text>
            </div>
            <Text className="text-xs sm:text-sm text-muted-foreground">
              Upload official club master roster (Programme, Register No, Name, School, Email, Club, Toastmaster).
            </Text>
          </div>

          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/attendance")}>
            <View className="flex-row items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <Text>Attendance Hub</Text>
            </View>
          </Button>
        </div>

        {/* Required columns checklist */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Required &amp; Supported Column Headers
          </Text>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="default" className="gap-1 font-mono"><Check className="h-3 w-3" /> Register No</Badge>
            <Badge variant="default" className="gap-1 font-mono"><Check className="h-3 w-3" /> Name</Badge>
            <Badge variant="default" className="gap-1 font-mono"><Check className="h-3 w-3" /> Email</Badge>
            <Badge variant="info" className="gap-1 font-mono">School</Badge>
            <Badge variant="info" className="gap-1 font-mono">Programme</Badge>
            <Badge variant="info" className="gap-1 font-mono">Mobile No</Badge>
            <Badge variant="info" className="gap-1 font-mono">Club</Badge>
            <Badge variant="info" className="gap-1 font-mono">Toastmaster</Badge>
          </div>
        </div>

        {/* Import Form Card */}
        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            {result && (
              <Alert variant="success">
                <div className="space-y-1">
                  <div className="flex flex-row items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <Text className="text-sm font-bold">Import Completed — {result.fileName}</Text>
                  </div>
                  <Text className="text-xs text-muted-foreground">
                    Processed {result.totalRows} rows • {result.imported} new records added • {result.updated} updated • {result.skipped} skipped
                  </Text>
                  {result.errors?.length > 0 && (
                    <div className="mt-2 rounded-xl bg-black/20 p-2.5 max-h-32 overflow-auto text-xs font-mono space-y-1">
                      <span className="font-bold text-destructive">Errors encountered:</span>
                      {result.errors.map((er: any, i: number) => (
                        <p key={i}>Row {er.row} [{er.registerNo || "-"}]: {er.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e: any) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e: any) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={`rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-border/80 bg-muted/20 hover:border-border hover:bg-muted/30"
                }`}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-primary/70 mb-3" />
                <Text className="text-sm font-bold text-foreground">
                  Drag &amp; drop your FFCS master CSV here
                </Text>
                <Text className="text-xs text-muted-foreground mt-1 mb-4">
                  or select file from your computer (CSV format up to 5MB)
                </Text>

                <input
                  id="ffcs-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e: any) => handleFile(e.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("ffcs-file")?.click()}
                >
                  {file ? (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <FileText className="h-4 w-4 text-primary" /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    "Choose CSV File"
                  )}
                </Button>
              </div>

              {/* CSV Preview */}
              {preview.length > 0 && (
                <div className="space-y-2">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    File Preview (First 5 Rows)
                  </Text>
                  <div className="overflow-auto rounded-xl border border-border/80 max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          {preview[0].map((h, i) => (
                            <TableHead key={i} className="text-xs font-mono font-bold">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/40">
                        {preview.slice(1).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((c, j) => (
                              <TableCell key={j} className="text-xs font-mono text-muted-foreground">{c}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={!file || submitting}
                className="w-full shadow-md shadow-primary/25"
              >
                {submitting ? "Importing & Mapping Members…" : "Upload & Sync Roster"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Imports History */}
        <Card variant="outline" className="border-border/80 bg-card/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-row items-center justify-between">
              <Text className="text-sm font-bold">Recent Import Batches</Text>
              <Badge variant="info" size="sm">{batches.length} total</Badge>
            </div>

            {batches.length === 0 ? (
              <Text className="text-xs text-muted-foreground">No recent import batches recorded.</Text>
            ) : (
              <div className="space-y-2">
                {batches.slice(0, 5).map((b: any) => (
                  <div
                    key={b.id}
                    className="flex flex-row items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 py-2.5"
                  >
                    <div className="space-y-0.5">
                      <Text className="text-xs font-bold text-foreground font-mono">{b.fileName}</Text>
                      <Text className="text-[10px] text-muted-foreground">
                        {b.rowCount} records • by @{b.createdBy?.username || "admin"} • {new Date(b.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <Badge size="sm" variant="info">{b.rowCount} rows</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

