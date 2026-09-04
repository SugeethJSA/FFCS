"use client";
import { View, Text, Badge, Skeleton } from "@/lib/ui";
import { Trophy, MapPin, Calendar } from "lucide-react";

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

export default function PointsTimeline({ points, loading }: { points: PointEntry[]; loading?: boolean }) {
  if (loading) {
    return (
      <View className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="rounded-xl border border-border bg-card p-4 flex flex-row gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <View className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!points.length) {
    return (
      <View className="rounded-xl border border-dashed border-border p-8 text-center">
        <Trophy className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <Text className="mt-2 text-sm font-semibold">No points yet</Text>
        <Text className="text-xs text-muted-foreground">Complete tasks and events to earn your first points!</Text>
      </View>
    );
  }

  return (
    <View className="relative">
      {/* vertical line */}
      <View className="absolute left-[19px] top-2 bottom-2 w-px bg-border hidden sm:block" />
      <View className="space-y-4">
        {points.map((p) => (
          <View key={p.id} className="relative flex flex-row gap-3 sm:gap-4">
            <View className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm z-10">
              <Trophy className="h-4 w-4 text-primary" />
            </View>
            <View className="flex-1 rounded-xl border border-border bg-card p-4">
              <View className="flex flex-wrap items-start justify-between gap-2">
                <View className="flex-1 min-w-0">
                  <Text className="font-semibold text-sm">{p.reason}</Text>
                  {p.how && <Text className="text-xs text-muted-foreground mt-0.5">How: {p.how}</Text>}
                  <View className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.where && (
                      <View className="flex flex-row items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <Text className="text-xs">{p.where}</Text>
                      </View>
                    )}
                    <View className="flex flex-row items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <Text className="text-xs">{new Date(p.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</Text>
                    </View>
                    <Text className="text-xs">by @{p.awardedBy.username}</Text>
                  </View>
                </View>
                <View className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="default" className="font-mono">+{p.amount} pts</Badge>
                  <Badge variant="info" size="sm">{p.category.name}</Badge>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
