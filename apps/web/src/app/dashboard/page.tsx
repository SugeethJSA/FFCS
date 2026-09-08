"use client";
import { useEffect, useState, useMemo } from "react";
import { View, Text, Card, CardContent, Badge, Button, Skeleton } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import PointsTimeline, { PointEntry } from "@/components/PointsTimeline";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Trophy, TrendingUp, Calendar, Award, Sparkles, ArrowRight, CheckCircle2, Flame, Layers } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchHistory, setSearchHistory] = useState("");

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

  const filteredPoints = useMemo(() => {
    if (!searchHistory.trim()) return points;
    const q = searchHistory.toLowerCase();
    return points.filter(
      (p) =>
        p.reason.toLowerCase().includes(q) ||
        (p.where && p.where.toLowerCase().includes(q)) ||
        (p.how && p.how.toLowerCase().includes(q)) ||
        p.category.name.toLowerCase().includes(q)
    );
  }, [points, searchHistory]);

  if (authLoading || !user) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="mx-auto w-full max-w-6xl p-8 space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <View className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </View>
        </View>
      </View>
    );
  }

  const rank = stats?.rank;
  const tierName =
    rank === 1
      ? "Club Champion"
      : rank && rank <= 3
      ? "Podium Achiever"
      : rank && rank <= 10
      ? "Top 10 Contributor"
      : "Active Contributor";

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-primary/15 via-card to-card p-6 sm:p-8 shadow-sm">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative">
            <View className="flex flex-row items-center gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-2xl sm:text-3xl shadow-md shadow-primary/25 shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Text className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    Welcome back, {user.displayName}
                  </Text>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                    <Sparkles className="h-3 w-3" />
                    {tierName}
                  </span>
                </div>
                <Text className="text-xs sm:text-sm font-mono text-muted-foreground">
                  @{user.username} {user.email ? `• ${user.email}` : ""}
                </Text>
              </div>
            </View>

            <View className="flex flex-row flex-wrap gap-2.5 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/leaderboard")}
                className="bg-card/80"
              >
                <View className="flex-row items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <Text>View Full Board</Text>
                </View>
              </Button>
            </View>
          </div>
        </div>

        {/* 3 Stat Cards */}
        <View className="grid gap-4 sm:grid-cols-3">
          {/* Total Points */}
          <Card variant="glass" className="border-border/80 p-5 shadow-xs">
            <CardContent className="p-0 flex flex-row items-center gap-4">
              <View className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 text-amber-500 ring-1 ring-amber-500/30">
                <Trophy className="h-6 w-6" />
              </View>
              <View className="space-y-0.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Points</Text>
                <Text className="text-3xl font-black text-foreground">
                  {loading ? "—" : stats?.totalPoints ?? user.totalPoints ?? 0}
                </Text>
                <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Fully verified
                </span>
              </View>
            </CardContent>
          </Card>

          {/* Current Rank */}
          <Card variant="glass" className="border-border/80 p-5 shadow-xs">
            <CardContent className="p-0 flex flex-row items-center gap-4">
              <View className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-500/20 to-purple-500/10 text-violet-500 ring-1 ring-violet-500/30">
                <TrendingUp className="h-6 w-6" />
              </View>
              <View className="space-y-0.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Standing</Text>
                <Text className="text-3xl font-black text-foreground">
                  {loading ? "—" : stats?.rank ? `#${stats.rank}` : "—"}
                </Text>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Across all active club members
                </span>
              </View>
            </CardContent>
          </Card>

          {/* Contributions Count */}
          <Card variant="glass" className="border-border/80 p-5 shadow-xs">
            <CardContent className="p-0 flex flex-row items-center gap-4">
              <View className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 text-emerald-500 ring-1 ring-emerald-500/30">
                <Award className="h-6 w-6" />
              </View>
              <View className="space-y-0.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Awards &amp; Logs</Text>
                <Text className="text-3xl font-black text-foreground">
                  {loading ? "—" : points.length}
                </Text>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Audited contribution entries
                </span>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Category Breakdown */}
        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <Text className="text-base font-bold">Category Distribution</Text>
              </div>
              {stats?.breakdown?.length > 0 && (
                <Badge variant="info" size="sm">
                  {stats.breakdown.length} active {stats.breakdown.length === 1 ? "category" : "categories"}
                </Badge>
              )}
            </div>

            {loading ? (
              <View className="space-y-3">
                <Skeleton className="h-3 w-full rounded-full" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-10 rounded-xl" />
                  <Skeleton className="h-10 rounded-xl" />
                </div>
              </View>
            ) : stats?.breakdown?.length ? (
              <View className="space-y-4">
                {/* Segmented Distribution Bar */}
                <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden flex flex-row gap-0.5 p-0.5">
                  {stats.breakdown.map((b: any, idx: number) => {
                    const pct = stats.totalPoints ? Math.max(1, Math.round((b.total / stats.totalPoints) * 100)) : 0;
                    const colors = [
                      "bg-primary",
                      "bg-violet-500",
                      "bg-amber-500",
                      "bg-emerald-500",
                      "bg-cyan-500",
                      "bg-rose-500",
                    ];
                    return (
                      <div
                        key={b.category.id}
                        title={`${b.category.name}: ${b.total} pts (${pct}%)`}
                        className={`h-full rounded-sm ${colors[idx % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>

                {/* Legend list */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.breakdown.map((b: any, idx: number) => {
                    const pct = stats.totalPoints ? Math.round((b.total / stats.totalPoints) * 100) : 0;
                    const dotColors = [
                      "bg-primary",
                      "bg-violet-500",
                      "bg-amber-500",
                      "bg-emerald-500",
                      "bg-cyan-500",
                      "bg-rose-500",
                    ];
                    return (
                      <View
                        key={b.category.id}
                        className="flex flex-row items-center justify-between rounded-xl border border-border/70 bg-card/50 p-3"
                      >
                        <div className="flex flex-row items-center gap-2.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                          <div>
                            <Text className="text-sm font-semibold text-foreground">{b.category.name}</Text>
                            <Text className="text-[11px] font-mono text-muted-foreground">{b.category.slug}</Text>
                          </div>
                        </div>
                        <div className="text-right">
                          <Text className="text-sm font-black font-mono">{b.total} pts</Text>
                          <Text className="text-[10px] text-muted-foreground font-semibold">{pct}%</Text>
                        </div>
                      </View>
                    );
                  })}
                </div>
              </View>
            ) : (
              <View className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2">
                <Flame className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <Text className="text-sm font-semibold">No category points yet</Text>
                <Text className="text-xs text-muted-foreground">
                  Participate in club hackathons, workshops, or meetings to earn your first category badges!
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Timeline Section */}
        <View className="space-y-4">
          <View className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <View className="flex flex-row items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <Text className="text-lg font-black tracking-tight">Points Activity Timeline</Text>
              <Badge variant="info" size="sm">{points.length} entries</Badge>
            </View>
          </View>

          {error && <Text className="text-sm text-destructive font-semibold">{error}</Text>}

          <PointsTimeline points={filteredPoints} loading={loading} />
        </View>
      </View>
    </View>
  );
}

