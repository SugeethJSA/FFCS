"use client";
import { useState, useMemo } from "react";
import { View, Text, Badge, Skeleton, Input } from "@/lib/ui";
import { Trophy, MapPin, Calendar, Sparkles, User, Search, X } from "lucide-react";

export interface PointEntry {
  id: string;
  amount: number;
  reason: string;
  where?: string | null;
  how?: string | null;
  createdAt: string;
  category: { name: string; slug: string; color?: string | null };
  awardedBy: { username: string; displayName: string };
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function PointsTimeline({ points, loading }: { points: PointEntry[]; loading?: boolean }) {
  const [filterQuery, setFilterQuery] = useState("");

  const displayPoints = useMemo(() => {
    if (!filterQuery.trim()) return points;
    const q = filterQuery.toLowerCase();
    return points.filter(
      (p) =>
        p.reason.toLowerCase().includes(q) ||
        (p.where && p.where.toLowerCase().includes(q)) ||
        (p.how && p.how.toLowerCase().includes(q)) ||
        p.category.name.toLowerCase().includes(q)
    );
  }, [points, filterQuery]);

  if (loading) {
    return (
      <View className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="rounded-2xl border border-border/80 bg-card p-4 flex flex-row gap-3.5 animate-pulse">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <View className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!points.length) {
    return (
      <View className="rounded-2xl border border-dashed border-border/80 p-10 text-center bg-card/40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/50">
          <Trophy className="h-6 w-6" />
        </div>
        <Text className="mt-3 text-sm font-bold text-foreground">No points recorded yet</Text>
        <Text className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          Attend club meetings, submit technical projects, or volunteer in events to start accumulating points on your record.
        </Text>
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {points.length > 3 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search timeline events…"
            value={filterQuery}
            onChange={(e: any) => setFilterQuery(e.target.value)}
            className="pl-8.5 pr-8 py-1.5 text-xs h-8 bg-card/60 border-border/70"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <View className="relative">
        {/* Continuous timeline line */}
        <View className="absolute left-[20px] top-3 bottom-3 w-0.5 bg-border/60 hidden sm:block" />

        <View className="space-y-3.5">
          {displayPoints.map((p) => {
            const relTime = formatRelativeTime(p.createdAt);
            const fullDate = new Date(p.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <View key={p.id} className="relative flex flex-row gap-3 sm:gap-4 items-start group">
                {/* Node icon */}
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-primary shadow-xs z-10 group-hover:border-primary/50 group-hover:scale-105 transition duration-200">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>

                {/* Entry Card */}
                <View className="flex-1 rounded-2xl border border-border/80 bg-card/70 p-4 hover:border-border transition duration-200 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Text className="font-bold text-sm text-foreground">{p.reason}</Text>
                        <Badge variant="info" size="sm" className="text-[10px] font-mono">
                          {p.category.name}
                        </Badge>
                      </div>

                      {p.how && (
                        <div className="flex flex-row items-center gap-1.5 text-xs text-muted-foreground">
                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                          <span>Method: {p.how}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        {p.where && (
                          <div className="flex flex-row items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground/70" />
                            <span>{p.where}</span>
                          </div>
                        )}

                        <div className="flex flex-row items-center gap-1" title={fullDate}>
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          <span>{relTime}</span>
                        </div>

                        <div className="flex flex-row items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground/70" />
                          <span>by @{p.awardedBy.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Point amount badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono font-black text-emerald-500 shadow-xs">
                        +{p.amount} pts
                      </div>
                    </div>
                  </div>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

