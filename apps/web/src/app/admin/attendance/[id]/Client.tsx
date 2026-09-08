"use client";
import { useEffect, useState, useMemo } from "react";
import { View, Text, Card, CardContent, Button, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Alert, Input, Label, OptionPicker } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Papa from "papaparse";
import { ArrowLeft, CheckCircle2, QrCode, Download, Upload, Copy, Check, Users, Award, ShieldAlert } from "lucide-react";

export default function AttendanceDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams() as { id: string };
  const rawId = params.id;
  const id = rawId && rawId !== "placeholder" ? rawId : (typeof window !== "undefined" ? window.location.pathname.split("/").pop()?.split("?")[0] || "" : "");
  const [session, setSession] = useState<any>(null);
  const [compare, setCompare] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"present" | "absent" | "unknown">("present");
  const [awardCat, setAwardCat] = useState("");
  const [awardAmt, setAwardAmt] = useState("10");
  const [awardReason, setAwardReason] = useState("");
  const [cats, setCats] = useState<any[]>([]);
  const [awardResult, setAwardResult] = useState("");
  const [search, setSearch] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    apiFetch("/api/categories")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.length) {
          setCats(j.data);
          if (!awardCat) setAwardCat(j.data[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/attendance/session/${id}`);
      const j = await r.json();
      if (j.success) setSession(j.data.session);
      const c = await apiFetch(`/api/attendance/session/${id}/compare`);
      const cj = await c.json();
      if (cj.success) setCompare(cj.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) load();
  }, [user, id]);

  const award = async () => {
    setAwardResult("");
    try {
      const res = await apiFetch(`/api/attendance/session/${id}/award`, {
        method: "POST",
        body: JSON.stringify({
          categorySlug: awardCat || undefined,
          amount: Number(awardAmt),
          reason: awardReason || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error));
      setAwardResult(`✓ Awarded points to ${j.data.awarded} attendees (skipped ${j.data.skipped}, already awarded ${j.data.alreadyAwarded})`);
      load();
    } catch (e: any) {
      setAwardResult("Error: " + e.message);
    }
  };

  const closeSession = async () => {
    await apiFetch(`/api/attendance/session/${id}/close`, { method: "POST" });
    load();
  };

  const handleMeetCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    setImportMsg("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        try {
          const rows = res.data as any[];
          const resp = await apiFetch(`/api/attendance/meet/${id}/import-csv`, {
            method: "POST",
            body: JSON.stringify({ rows }),
          });
          const j = await resp.json();
          if (!resp.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error));
          setImportMsg(`Successfully imported ${j.data.imported} rows from Meet CSV`);
          load();
        } catch (err: any) {
          setImportMsg("Import failed: " + err.message);
        } finally {
          setImportingCsv(false);
          (e.target as HTMLInputElement).value = "";
        }
      },
      error: (err) => {
        setImportMsg("Parse failed: " + err.message);
        setImportingCsv(false);
      },
    });
  };

  const exportCsv = (rows: any[], filename: string) => {
    const header = ["Participant Name", "Register No", "Email", "Status", "Source"];
    const csv = [header.join(",")].concat(
      rows.map((r: any) => [
        `"${(r.name || r.cleanName || r.rawName || "").replace(/"/g, '""')}"`,
        `"${r.registerNo || ""}"`,
        `"${r.email || ""}"`,
        `"${r.isPresent ? "Present" : "Absent"}"`,
        `"${r.source || ""}"`,
      ].join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  if (authLoading) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="p-12 text-center"><Text className="text-sm text-muted-foreground">Loading session…</Text></View>
      </View>
    );
  }

  const present = compare?.present || [];
  const absent = compare?.absent || [];
  const unknown = compare?.unknown || [];

  const filtered = (arr: any[]) =>
    arr.filter((r: any) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (r.name || r.rawName || r.cleanName || "").toLowerCase().includes(s) ||
        (r.registerNo || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s)
      );
    });

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/attendance")} className="self-start">
          <View className="flex-row items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <Text>Back to Sessions</Text>
          </View>
        </Button>

        {loading ? (
          <Text className="text-sm text-muted-foreground">Loading session details…</Text>
        ) : session && (
          <>
            {/* Session Overview Card */}
            <Card className="border-border/80 bg-card/80 shadow-md">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text className="text-2xl font-black text-foreground">{session.title}</Text>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          session.status === "OPEN"
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${session.status === "OPEN" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                        {session.status}
                      </span>
                    </div>

                    <Text className="text-xs sm:text-sm text-muted-foreground">
                      {session.type === "IN_PERSON" ? "In-Person QR Event" : "Google Meet Sync"} • {new Date(session.date).toLocaleString()}
                      {session.venue ? ` • Venue: ${session.venue}` : ""}
                    </Text>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="info" size="sm">{session.type}</Badge>
                      {session.category && <Badge variant="info" size="sm">{session.category.name}</Badge>}
                      {session.points && <Badge variant="default" size="sm">+{session.points} pts / person</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {session.inPersonEvent?.slug && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/in-person/${session.inPersonEvent.slug}`);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                      >
                        {copiedLink ? (
                          <span className="flex items-center gap-1 text-emerald-500"><Check className="h-3.5 w-3.5" /> Copied Link</span>
                        ) : (
                          <span className="flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copy /in-person Link</span>
                        )}
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => router.push("/admin/attendance/scan")}>
                      <QrCode className="h-4 w-4 mr-1 text-emerald-500" /> Scan QR
                    </Button>
                    <Button
                      size="sm"
                      variant={session.status === "CLOSED" ? "outline" : "outline"}
                      onClick={closeSession}
                      disabled={session.status === "CLOSED"}
                    >
                      {session.status === "CLOSED" ? "Session Closed" : "Close Session"}
                    </Button>
                  </div>
                </div>

                {/* Statistics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/60 text-xs">
                  <div className="rounded-xl border border-border/70 bg-card/40 p-3">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Total Records</span>
                    <p className="text-lg font-black text-foreground">{compare?.counts?.totalRecords ?? session.records?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <span className="text-emerald-500 text-[10px] uppercase font-bold tracking-wider">Present</span>
                    <p className="text-lg font-black text-emerald-500">{compare?.counts?.present ?? present.length}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <span className="text-amber-500 text-[10px] uppercase font-bold tracking-wider">Absent (FFCS)</span>
                    <p className="text-lg font-black text-amber-500">{compare?.counts?.absent ?? absent.length}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card/40 p-3">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Unknown Attendees</span>
                    <p className="text-lg font-black text-foreground">{compare?.counts?.unknown ?? unknown.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Batch Award Points Card */}
            <Card className="border-border/80 bg-card/80 shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <Text className="text-sm font-bold">Batch Award Points to Present Attendees</Text>
                  </div>
                  {awardResult && <Text className="text-xs font-semibold text-emerald-500">{awardResult}</Text>}
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-mono">Category</Label>
                    <OptionPicker value={awardCat} onChange={setAwardCat} options={cats.map((c) => ({ value: c.slug, label: c.name }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-mono">Amount (pts)</Label>
                    <Input type="number" value={awardAmt} onChange={(e: any) => setAwardAmt(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-mono">Reason</Label>
                    <Input value={awardReason} onChange={(e: any) => setAwardReason(e.target.value)} placeholder={`Attended ${session.title}`} />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                  <Button size="sm" onClick={award} disabled={present.length === 0} className="shadow-xs">
                    Award {awardAmt} pts to {present.length} Present Members
                  </Button>
                  <Text className="text-[11px] text-muted-foreground">
                    ✓ Idempotent: Already-awarded members for this session are skipped automatically.
                  </Text>
                </div>
              </CardContent>
            </Card>

            {/* Meet CSV Uploader if Meet type */}
            {session?.type === "MEET" && (
              <Card variant="glass" className="border-border/80 p-5">
                <CardContent className="p-0 space-y-2">
                  <Text className="text-sm font-bold flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-primary" /> Upload Google Meet CSV
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Upload participant export from Google Meet. Register numbers are automatically resolved from student names and emails.
                  </Text>
                  <div className="flex flex-row items-center gap-3 pt-1">
                    <input type="file" accept=".csv" onChange={handleMeetCsv} disabled={importingCsv} className="text-xs" />
                    {importingCsv && <span className="text-xs font-mono text-primary">Importing rows…</span>}
                    {importMsg && <span className="text-xs font-semibold text-emerald-500">{importMsg}</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparison Table with Tabs */}
            <Card className="border-border/80 bg-card/80 shadow-md">
              <CardContent className="p-5 space-y-4">
                {/* Tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-row gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTab("present")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        tab === "present"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Present ({present.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("absent")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        tab === "absent"
                          ? "bg-amber-500 text-amber-950 shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Absent ({absent.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("unknown")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        tab === "unknown"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Unknown ({unknown.length})
                    </button>
                  </div>

                  <div className="flex flex-row items-center gap-2">
                    <Input
                      placeholder="Search name / reg no…"
                      value={search}
                      onChange={(e: any) => setSearch(e.target.value)}
                      className="max-w-xs text-xs h-8"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const rows = tab === "present" ? present : tab === "absent" ? absent : unknown;
                        exportCsv(filtered(rows), `ffcs-${session.title}-${tab}.csv`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Export
                    </Button>
                  </div>
                </div>

                {/* Table content */}
                <div className="overflow-auto rounded-xl border border-border/80">
                  {tab === "present" && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs uppercase">Name</TableHead>
                          <TableHead className="text-xs uppercase">Reg No</TableHead>
                          <TableHead className="text-xs uppercase">Email</TableHead>
                          <TableHead className="text-xs uppercase">Source</TableHead>
                          <TableHead className="text-xs uppercase">Member Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/40">
                        {filtered(present).map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-medium">{r.cleanName || r.rawName}</TableCell>
                            <TableCell className="text-xs font-mono font-bold">{r.registerNo || "-"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.email || "-"}</TableCell>
                            <TableCell><Badge size="sm">{r.source}</Badge></TableCell>
                            <TableCell className="text-xs">
                              {r.userId ? (
                                <span className="text-emerald-500 font-semibold">✓ Linked</span>
                              ) : (
                                <span className="text-muted-foreground">Unlinked</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {tab === "absent" && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs uppercase">Student Name</TableHead>
                          <TableHead className="text-xs uppercase">Register No</TableHead>
                          <TableHead className="text-xs uppercase">School</TableHead>
                          <TableHead className="text-xs uppercase">VIT Email</TableHead>
                          <TableHead className="text-xs uppercase">Club</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/40">
                        {filtered(absent).map((r: any) => (
                          <TableRow key={r.registerNo}>
                            <TableCell className="text-xs font-medium">{r.name}</TableCell>
                            <TableCell className="text-xs font-mono font-bold">{r.registerNo}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.school || "-"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                            <TableCell className="text-xs">{r.club || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {tab === "unknown" && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs uppercase">Raw Name</TableHead>
                          <TableHead className="text-xs uppercase">Parsed Reg No</TableHead>
                          <TableHead className="text-xs uppercase">Email</TableHead>
                          <TableHead className="text-xs uppercase">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/40">
                        {filtered(unknown).map((r: any) => (
                          <TableRow key={r.id || r.email}>
                            <TableCell className="text-xs font-medium">{r.rawName || r.name}</TableCell>
                            <TableCell className="text-xs font-mono">{r.registerNo || "-"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.email || "-"}</TableCell>
                            <TableCell><Badge size="sm">{r.source || "unknown"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </View>
    </View>
  );
}

