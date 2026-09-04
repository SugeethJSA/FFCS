"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Badge, Button, Skeleton } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import PointsTimeline, { PointEntry } from "@/components/PointsTimeline";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Trophy, TrendingUp, Calendar, Award } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch("/api/points/me/stats").then(r => r.json()),
      apiFetch("/api/points/me?limit=50").then(r => r.json()),
    ])
      .then(([statsJson, pointsJson]) => {
        if (cancelled) return;
        if (statsJson.success) setStats(statsJson.data);
        if (pointsJson.success) setPoints(pointsJson.data.points || []);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading || !user) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="mx-auto w-full max-w-6xl p-8"><Skeleton className="h-32 w-full" /></View>
      </View>
    );
  }

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        {/* Header */}
        <View className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <View>
            <Text className="text-2xl font-black tracking-tight">My Dashboard</Text>
            <Text className="text-sm text-muted-foreground">Track what you earned, where and how — fully auditable history.</Text>
          </View>
          <Button variant="outline" size="sm" onClick={() => router.push("/leaderboard")}>View leaderboard</Button>
        </View>

        {/* Stat cards */}
        <View className="grid gap-3 sm:grid-cols-3">
          <Card variant="glass">
            <CardContent className="p-5 flex flex-row items-center gap-4">
              <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15"><Trophy className="h-5 w-5 text-amber-600" /></View>
              <View>
                <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total points</Text>
                <Text className="text-2xl font-black">{loading ? "—" : stats?.totalPoints ?? 0}</Text>
              </View>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 flex flex-row items-center gap-4">
              <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15"><TrendingUp className="h-5 w-5 text-violet-600" /></View>
              <View>
                <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rank</Text>
                <Text className="text-2xl font-black">#{loading ? "—" : stats?.rank ?? "—"}</Text>
              </View>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 flex flex-row items-center gap-4">
              <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15"><Award className="h-5 w-5 text-emerald-600" /></View>
              <View>
                <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Awards</Text>
                <Text className="text-2xl font-black">{loading ? "—" : points.length}</Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Breakdown */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <Text className="text-sm font-bold">Breakdown by category</Text>
            {loading ? (
              <View className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</View>
            ) : stats?.breakdown?.length ? (
              <View className="space-y-2">
                {stats.breakdown.map((b: any) => {
                  const pct = stats.totalPoints ? Math.round((b.total / stats.totalPoints) * 100) : 0;
                  return (
                    <View key={b.category.id} className="flex flex-row items-center gap-3">
                      <View className="flex-1">
                        <View className="flex flex-row items-center justify-between">
                          <Text className="text-sm font-medium">{b.category.name}</Text>
                          <Text className="text-xs font-mono text-muted-foreground">{b.total} pts · {pct}%</Text>
                        </View>
                        <View className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </View>
                      </View>
                      <Badge variant="info" size="sm">{b.category.slug}</Badge>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="text-sm text-muted-foreground">No breakdown yet — earn your first points to see categories.</Text>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <View className="space-y-3">
          <View className="flex flex-row items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Text className="text-sm font-bold">History — where & how you earned points</Text>
            <Badge variant="info" size="sm">{points.length} entries</Badge>
          </View>
          {error && <Text className="text-sm text-destructive">{error}</Text>}
          <PointsTimeline points={points} loading={loading} />
        </View>
      </View>
    </View>
  );
}
