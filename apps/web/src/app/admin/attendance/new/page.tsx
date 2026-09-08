"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert, Badge, OptionPicker, Textarea } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { QrCode, Video, Plus, ArrowLeft, Calendar, MapPin, CheckCircle2 } from "lucide-react";

export default function NewAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [type, setType] = useState<"IN_PERSON" | "MEET">("IN_PERSON");
  const [form, setForm] = useState({
    title: "",
    venue: "",
    meetLink: "",
    date: "",
    startTime: "",
    allowedDomains: "vitstudent.ac.in",
    allowedEmails: "",
    categorySlug: "",
    points: "10",
  });
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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
          if (!form.categorySlug) setForm((f) => ({ ...f, categorySlug: j.data[0].slug }));
        }
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const payload: any = {
        title: form.title.trim(),
        venue: form.venue.trim() || undefined,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        startTime: form.startTime ? new Date(form.startTime).toISOString() : new Date().toISOString(),
        categorySlug: form.categorySlug || undefined,
        points: form.points ? Number(form.points) : undefined,
      };
      let url = "";
      if (type === "IN_PERSON") {
        payload.allowedEmailDomains = form.allowedDomains.split(",").map((s) => s.trim()).filter(Boolean);
        payload.allowedEmails = form.allowedEmails.split(",").map((s) => s.trim()).filter(Boolean);
        url = "/api/attendance/in-person";
      } else {
        payload.meetLink = form.meetLink.trim() || undefined;
        url = "/api/attendance/meet";
      }
      const res = await apiFetch(url, { method: "POST", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error) || j.message);
      setResult(j.data);
      const sessionId = j.data.session?.id;
      if (sessionId) setTimeout(() => router.push(`/admin/attendance/${sessionId}`), 800);
    } catch (err: any) {
      setError(err.message || "Failed to create session");
    } finally {
      setSubmitting(false);
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
      <View className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-row items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight">Create Attendance Session</Text>
            </div>
            <Text className="text-xs sm:text-sm text-muted-foreground">
              Configure in-person venue QR registration links or Google Meet session tracking.
            </Text>
          </div>

          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/attendance")}>
            <View className="flex-row items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <Text>Attendance Hub</Text>
            </View>
          </Button>
        </div>

        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("IN_PERSON")}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${
              type === "IN_PERSON"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border/80 bg-card hover:border-border text-muted-foreground"
            }`}
          >
            <QrCode className="h-6 w-6 mb-1.5" />
            <span className="text-sm font-bold">In-Person Event</span>
            <span className="text-[11px] opacity-75">QR check-in at physical venue</span>
          </button>

          <button
            type="button"
            onClick={() => setType("MEET")}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${
              type === "MEET"
                ? "border-violet-500 bg-violet-500/10 text-violet-500 shadow-xs"
                : "border-border/80 bg-card hover:border-border text-muted-foreground"
            }`}
          >
            <Video className="h-6 w-6 mb-1.5" />
            <span className="text-sm font-bold">Google Meet</span>
            <span className="text-[11px] opacity-75">Chrome Extension or CSV capture</span>
          </button>
        </div>

        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            {result && (
              <Alert variant="success">
                <div className="flex flex-row items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <Text className="text-sm font-bold">Created! Redirecting to session details…</Text>
                </div>
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                  Session Title *
                </Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e: any) => setForm({ ...form, title: e.target.value })}
                  placeholder={type === "IN_PERSON" ? "e.g. AI Hackathon Orientation" : "e.g. Weekly Club Sync #14"}
                />
              </div>

              {type === "IN_PERSON" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Venue / Room
                  </Label>
                  <Input
                    value={form.venue}
                    onChange={(e: any) => setForm({ ...form, venue: e.target.value })}
                    placeholder="e.g. Netaji Auditorium, VIT Chennai"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <Video className="h-3 w-3" /> Meet Link / Code
                  </Label>
                  <Input
                    type="url"
                    value={form.meetLink}
                    onChange={(e: any) => setForm({ ...form, meetLink: e.target.value })}
                    placeholder="https://meet.google.com/abc-defg-hij"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date *
                  </Label>
                  <Input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e: any) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Start Time *
                  </Label>
                  <Input
                    required
                    type="time"
                    value={form.startTime}
                    onChange={(e: any) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
              </div>

              {type === "IN_PERSON" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                      Allowed Email Domains (comma-separated)
                    </Label>
                    <Input
                      value={form.allowedDomains}
                      onChange={(e: any) => setForm({ ...form, allowedDomains: e.target.value })}
                      placeholder="vitstudent.ac.in"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                      Allowed Specific Emails (optional)
                    </Label>
                    <Textarea
                      value={form.allowedEmails}
                      onChange={(e: any) => setForm({ ...form, allowedEmails: e.target.value })}
                      placeholder="student1@vitstudent.ac.in, student2@vitstudent.ac.in"
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                    Category
                  </Label>
                  <OptionPicker
                    value={form.categorySlug}
                    onChange={(v) => setForm({ ...form, categorySlug: v })}
                    options={cats.map((c) => ({ value: c.slug, label: c.name }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                    Points Per Attendance
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.points}
                    onChange={(e: any) => setForm({ ...form, points: e.target.value })}
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full shadow-md shadow-primary/25 mt-2"
              >
                {submitting ? "Creating Session…" : "Create Attendance Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

