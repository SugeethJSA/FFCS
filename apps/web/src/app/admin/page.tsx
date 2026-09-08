"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert, Badge, OptionPicker } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Shield, Award, Sparkles, User, MapPin, Zap, CheckCircle2, FileSpreadsheet, CheckSquare } from "lucide-react";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState({ recipientUsername: "", amount: "10", reason: "", where: "", how: "", categorySlug: "" });
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) router.replace("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    apiFetch("/api/categories")
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.length) {
          setCats(j.data);
          if (!form.categorySlug) setForm(f => ({ ...f, categorySlug: j.data[0].slug }));
        }
      })
      .catch(() => {});
  }, []);

  const pointPresets = ["5", "10", "25", "50", "100"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(""); setResult("");
    try {
      const res = await apiFetch("/api/admin/award", {
        method: "POST",
        body: JSON.stringify({
          recipientUsername: form.recipientUsername.trim().toLowerCase(),
          amount: Number(form.amount),
          reason: form.reason.trim(),
          where: form.where.trim() || undefined,
          how: form.how.trim() || undefined,
          categorySlug: form.categorySlug || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error) || j.message);
      setResult(`Successfully awarded +${j.data.amount} pts to @${j.data.recipient.username} for "${j.data.reason}"!`);
      setForm({ ...form, reason: "", where: "", how: "" });
    } catch (err: any) {
      setError(err.message || "Failed to award");
    } finally { setSubmitting(false); }
  };

  if (authLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="p-12 text-center">
          <Text className="text-sm text-muted-foreground">Verifying administrator permissions…</Text>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
                <Shield className="h-5 w-5" />
              </div>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight">Award Points</Text>
              <Badge variant="info" size="sm" className="font-mono text-xs">{user.role}</Badge>
            </div>
            <Text className="text-xs sm:text-sm text-muted-foreground">
              Official admin dispatch: grant audited points with location, method, and category attribution.
            </Text>
          </div>

          <div className="flex flex-row gap-2 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/import")}>
              <View className="flex-row items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                <Text>Import Master</Text>
              </View>
            </Button>
            <Button size="sm" onClick={() => router.push("/admin/attendance")}>
              <View className="flex-row items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />
                <Text>Attendance</Text>
              </View>
            </Button>
          </div>
        </div>

        {/* Award Form */}
        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            {result && (
              <Alert variant="success">
                <div className="flex flex-row items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <Text className="text-sm font-semibold">{result}</Text>
                </div>
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-5">
              {/* Recipient and Amount */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Recipient Username *
                  </Label>
                  <Input
                    required
                    value={form.recipientUsername}
                    onChange={(e: any) => setForm({ ...form, recipientUsername: e.target.value })}
                    placeholder="e.g. aaravsharma or 25bce1001"
                    className="lowercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <Award className="h-3 w-3" /> Amount (Pts) *
                  </Label>
                  <Input
                    required
                    type="number"
                    min={1}
                    max={1000}
                    value={form.amount}
                    onChange={(e: any) => setForm({ ...form, amount: e.target.value })}
                    className="font-mono font-bold"
                  />
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono mr-1">Presets:</span>
                    {pointPresets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setForm({ ...form, amount: amt })}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-bold transition ${
                          form.amount === amt
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Reason *
                </Label>
                <Input
                  required
                  value={form.reason}
                  onChange={(e: any) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Won Tech Hackathon 1st place, or Led AI Workshop"
                />
              </div>

              {/* Where and How */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Where (Venue / Event)
                  </Label>
                  <Input
                    value={form.where}
                    onChange={(e: any) => setForm({ ...form, where: e.target.value })}
                    placeholder="e.g. Main Auditorium, VIT Chennai"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" /> How (Method / Contribution)
                  </Label>
                  <Input
                    value={form.how}
                    onChange={(e: any) => setForm({ ...form, how: e.target.value })}
                    placeholder="e.g. Presented working demo"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                  Category *
                </Label>
                <OptionPicker
                  value={form.categorySlug}
                  onChange={(v) => setForm({ ...form, categorySlug: v })}
                  options={cats.map(c => ({ value: c.slug, label: c.name }))}
                />
                {!cats.length && <Text className="text-xs text-muted-foreground">Loading categories…</Text>}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting || !form.categorySlug}
                className="w-full shadow-md shadow-primary/20"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Award className="h-4 w-4" />
                  <Text className="font-bold">{submitting ? "Awarding Points…" : `Award ${form.amount || "0"} Points`}</Text>
                </View>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security & Audit notice */}
        <Card variant="outline" className="border-border/70 bg-card/40">
          <CardContent className="p-4 space-y-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Security &amp; Audit Trace</Text>
            <Text className="text-xs text-muted-foreground leading-relaxed">
              Every award records the awarding admin ID, IP address, and exact timestamp. Total member points update synchronously and reflect on the public leaderboard. If an award was made in error, contact a Super Admin or use the point revocation API.
            </Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

