"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert, Badge, OptionPicker } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

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
    apiFetch("/api/categories").then(r => r.json()).then(j => { if (j.success) setCats(j.data); }).catch(() => {});
  }, []);

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
      setResult(`Awarded +${j.data.amount} pts to @${j.data.recipient.username} for "${j.data.reason}"`);
      setForm({ ...form, reason: "", where: "", how: "" });
    } catch (err: any) {
      setError(err.message || "Failed to award");
    } finally { setSubmitting(false); }
  };

  if (authLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="p-8 text-center"><Text className="text-sm text-muted-foreground">Checking permissions…</Text></View>
      </View>
    );
  }

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <View className="flex flex-row items-start justify-between gap-4">
          <View>
            <Text className="text-2xl font-black tracking-tight">Admin — Award Points</Text>
            <Text className="text-sm text-muted-foreground">Only ADMIN / SUPER_ADMIN can award. Every award is audited with who, where, how and category.</Text>
            <Badge variant="info" className="mt-2">Role: {user.role}</Badge>
          </View>
          <View className="flex flex-row gap-2">
            <Button variant="outline" size="sm" onClick={()=>router.push("/admin/import")}>Import FFCS List</Button>
            <Button size="sm" onClick={()=>router.push("/admin/attendance")}>Attendance →</Button>
          </View>
        </View>

        <Card>
          <CardContent className="p-6 space-y-4">
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            {result && <Alert variant="success"><Text className="text-sm">{result}</Text></Alert>}
            <form onSubmit={submit} className="space-y-4">
              <View className="grid gap-4 sm:grid-cols-2">
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Recipient username *</Label>
                  <Input required value={form.recipientUsername} onChange={(e: any) => setForm({ ...form, recipientUsername: e.target.value })} placeholder="aaravsharma" className="lowercase" />
                </View>
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Amount (1–1000) *</Label>
                  <Input required type="number" min={1} max={1000} value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e.target.value })} />
                </View>
              </View>

              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Reason *</Label>
                <Input required value={form.reason} onChange={(e: any) => setForm({ ...form, reason: e.target.value })} placeholder="Won Tech Hackathon 1st place" />
              </View>

              <View className="grid gap-4 sm:grid-cols-2">
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Where (place / event)</Label>
                  <Input value={form.where} onChange={(e: any) => setForm({ ...form, where: e.target.value })} placeholder="Main Auditorium, VIT Chennai" />
                </View>
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">How (method / achievement)</Label>
                  <Input value={form.how} onChange={(e: any) => setForm({ ...form, how: e.target.value })} placeholder="Presented winning prototype" />
                </View>
              </View>

              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Category *</Label>
                <OptionPicker
                  value={form.categorySlug}
                  onChange={(v) => setForm({ ...form, categorySlug: v })}
                  options={cats.map(c => ({ value: c.slug, label: c.name }))}
                />
                {!cats.length && <Text className="text-xs text-muted-foreground">Loading categories…</Text>}
              </View>

              <Button type="submit" disabled={submitting || !form.categorySlug} className="w-full">
                {submitting ? "Awarding…" : "Award points"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardContent className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Security notes</Text>
            <Text className="mt-1 text-xs text-muted-foreground leading-relaxed">All awards are logged with awardedBy, IP rate-limited (30/hour), validated via Zod, and reflected instantly in the denormalized totalPoints for fast leaderboard queries. Revocation requires SUPER_ADMIN or original awarder — use DELETE /api/admin/point/:id.</Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
