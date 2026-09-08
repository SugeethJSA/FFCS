"use client";
import { useEffect, useState, useMemo } from "react";
import { View, Text, Card, CardContent, Button, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Skeleton } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import MeetImportBridge from "@/components/MeetImportBridge";
import { CheckSquare, Plus, QrCode, FileSpreadsheet, RefreshCw, Copy, Check, Users, Video, MapPin, Calendar } from "lucide-react";

export default function AttendanceListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "MEET" | "IN_PERSON">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const q = filter === "ALL" ? "" : `?type=${filter}`;
      const res = await apiFetch(`/api/attendance/sessions${q}`);
      const j = await res.json();
      if (j.success) setSessions(j.data.sessions || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user, filter]);

  const stats = useMemo(() => {
    const inPerson = sessions.filter((s) => s.type === "IN_PERSON").length;
    const meet = sessions.filter((s) => s.type === "MEET").length;
    const totalPresent = sessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
    return { total: sessions.length, inPerson, meet, totalPresent };
  }, [sessions]);

  const copyEventLink = (slug: string, id: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/in-person/${slug}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (authLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="p-12 text-center">
          <Text className="text-sm text-muted-foreground">Checking administrator permissions…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-row items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <CheckSquare className="h-5 w-5" />
              </div>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight">Attendance Management</Text>
              <Badge variant="info" size="sm">Admin Portal</Badge>
            </div>
            <Text className="text-xs sm:text-sm text-muted-foreground">
              Monitor Google Meet sync &amp; In-Person QR events, verify attendees against FFCS master, and batch award points.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/import")}>
              <View className="flex-row items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                <Text>Import Master</Text>
              </View>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push("/admin/attendance/scan")}>
              <View className="flex-row items-center gap-1.5">
                <QrCode className="h-4 w-4 text-emerald-500" />
                <Text>Scan QR</Text>
              </View>
            </Button>
            <Button size="sm" onClick={() => router.push("/admin/attendance/new")} className="shadow-xs">
              <View className="flex-row items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <Text>New Session</Text>
              </View>
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Card variant="glass" className="border-border/80 p-4">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Sessions</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">{loading ? "—" : stats.total}</Text>
          </Card>
          <Card variant="glass" className="border-border/80 p-4">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" /> In-Person Events
            </Text>
            <Text className="mt-1 text-2xl font-black text-foreground">{loading ? "—" : stats.inPerson}</Text>
          </Card>
          <Card variant="glass" className="border-border/80 p-4">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Video className="h-3 w-3 text-violet-500" /> Google Meet Syncs
            </Text>
            <Text className="mt-1 text-2xl font-black text-foreground">{loading ? "—" : stats.meet}</Text>
          </Card>
          <Card variant="glass" className="border-border/80 p-4">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 text-emerald-500" /> Total Present Logged
            </Text>
            <Text className="mt-1 text-2xl font-black text-foreground">{loading ? "—" : stats.totalPresent}</Text>
          </Card>
        </div>

        <MeetImportBridge />

        {/* Filters and Refresh */}
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row gap-1.5">
            {(["ALL", "IN_PERSON", "MEET"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "ALL" ? "All Sessions" : f === "IN_PERSON" ? "In-Person QR" : "Google Meet"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={load} className="text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {/* Session Table */}
        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardContent className="p-0 overflow-auto">
            {loading ? (
              <View className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded" />
                <Skeleton className="h-10 w-full rounded" />
                <Skeleton className="h-10 w-full rounded" />
              </View>
            ) : sessions.length === 0 ? (
              <View className="p-12 text-center space-y-3">
                <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <Text className="text-sm font-bold text-foreground">No attendance sessions found</Text>
                <Text className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create an In-Person QR link or import a Google Meet session to begin tracking attendance.
                </Text>
                <Button size="sm" onClick={() => router.push("/admin/attendance/new")} className="mt-2">
                  Create First Session
                </Button>
              </View>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Session Title &amp; Venue</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Scheduled Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Present / Total</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {sessions.map((s: any) => {
                    const isOpen = s.status === "OPEN";
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="space-y-0.5">
                            <Text className="text-sm font-bold text-foreground">{s.title}</Text>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {s.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground/70" />
                                  {s.venue}
                                </span>
                              )}
                              {s.inPersonEvent?.slug && (
                                <span className="font-mono text-[11px] text-primary">
                                  /in-person/{s.inPersonEvent.slug}
                                </span>
                              )}
                              {s.meetCode && <span className="font-mono text-[11px]">{s.meetCode}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge size="sm" variant={s.type === "IN_PERSON" ? "info" : "default"}>
                            {s.type === "IN_PERSON" ? "In-Person QR" : "Google Meet"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex flex-row items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(s.date).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isOpen
                                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                            {s.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          <span className="font-bold text-foreground">{s.presentCount}</span>
                          <span className="text-muted-foreground">/{s.totalCount}</span>
                          {s.category?.name && <span className="text-muted-foreground ml-1">· {s.category.name}</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-row gap-1.5 justify-end">
                            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/attendance/${s.id}`)}>
                              View Details
                            </Button>
                            {s.inPersonEvent?.slug && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyEventLink(s.inPersonEvent.slug, s.id)}
                                title="Copy public registration link"
                              >
                                {copiedId === s.id ? (
                                  <span className="flex items-center gap-1 text-emerald-500 text-xs">
                                    <Check className="h-3.5 w-3.5" /> Copied
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs">
                                    <Copy className="h-3.5 w-3.5" /> Link
                                  </span>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

