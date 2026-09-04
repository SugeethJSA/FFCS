"use client";
import { useEffect, useState } from "react";
import { View, Text, Input, Badge, Skeleton, Button, OptionPicker } from "@/lib/ui";
import { apiFetch } from "@/lib/api";
import { Search, Trophy, Medal, Crown } from "lucide-react";

interface Entry {
  rank: number;
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null; totalPoints: number };
  totalPoints: number;
  isMe?: boolean;
}

export default function LeaderboardTable() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const r = await apiFetch("/api/categories");
      if (r.ok) {
        const j = await r.json();
        setCategories(j.data || []);
      }
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    apiFetch(`/api/leaderboard?${params.toString()}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (!cancelled) {
          setEntries(j.data.leaderboard || []);
          setTotal(j.data.total || 0);
        }
      })
      .catch((e) => !cancelled && setError(e.message || "Failed to load leaderboard"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [search, category, offset, limit]);

  // reset offset when filters change
  useEffect(() => { setOffset(0); }, [search, category]);

  function rankIcon(rank: number) {
    if (rank === 1) return <Crown className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-zinc-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
    return <Trophy className="h-4 w-4 text-muted-foreground/40" />;
  }

  return (
    <View className="space-y-4">
      {/* Controls */}
      <View className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View className="flex flex-1 flex-row items-center gap-2">
          <View className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search members…" value={search} onChange={(e: any) => setSearch(e.target.value)} className="pl-9" />
          </View>
          {categories.length > 0 && (
            <OptionPicker
              value={category}
              onChange={(v) => setCategory(v === "all" ? "" : v)}
              options={[{ value: "all", label: "All categories" }, ...categories.map(c => ({ value: c.slug, label: c.name }))]}
              className="w-[200px]"
            />
          )}
        </View>
        <Text className="text-xs font-mono text-muted-foreground">{total} members</Text>
      </View>

      {/* Podium for top 3 when not searching/filtering and on first page */}
      {!loading && entries.length >= 3 && offset === 0 && !search && !category && (
        <View className="grid grid-cols-3 gap-3">
          {[entries[1], entries[0], entries[2]].filter(Boolean).map((e) => (
            <View key={e.user.id} className={`flex flex-col items-center rounded-2xl border p-4 ${e.rank === 1 ? "border-amber-500/30 bg-amber-500/5 order-2 -mt-2" : e.rank === 2 ? "order-1 bg-card" : "order-3 bg-card"} ${e.isMe ? "ring-2 ring-primary/50" : ""}`}>
              <View className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${e.rank === 1 ? "bg-amber-500 text-white" : e.rank === 2 ? "bg-zinc-300 text-zinc-900" : "bg-amber-800 text-amber-100"}`}>{e.rank}</View>
              <View className="mt-2 h-12 w-12 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center">
                <Text className="font-bold text-primary">{e.user.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text className="mt-2 text-sm font-bold text-center line-clamp-1">{e.user.displayName}</Text>
              <Text className="text-xs font-mono text-muted-foreground">@{e.user.username}</Text>
              <Badge variant={e.rank === 1 ? "default" : "info"} className="mt-2">{e.totalPoints} pts</Badge>
            </View>
          ))}
        </View>
      )}

      {/* Table */}
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <View className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b border-border">
              <tr className="text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3 w-20">#</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-5 w-8" /></td>
                    <td className="px-4 py-3"><View className="flex flex-row items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></View></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">{error || "No members found."}</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.user.id} className={`border-b border-border/50 hover:bg-muted/40 ${e.isMe ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3">
                      <View className="flex flex-row items-center gap-2">
                        <Text className={`font-mono text-xs font-bold ${e.rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>#{e.rank}</Text>
                        {e.rank <= 3 && rankIcon(e.rank)}
                      </View>
                    </td>
                    <td className="px-4 py-3">
                      <View className="flex flex-row items-center gap-3">
                        <View className="h-8 w-8 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Text className="text-xs font-bold text-primary">{e.user.displayName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View className="min-w-0">
                          <View className="flex flex-row items-center gap-2">
                            <Text className="font-semibold truncate">{e.user.displayName}</Text>
                            {e.isMe && <Badge variant="default" size="sm">You</Badge>}
                          </View>
                          <Text className="text-xs font-mono text-muted-foreground">@{e.user.username}</Text>
                        </View>
                      </View>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={e.rank === 1 ? "default" : e.rank <= 3 ? "info" : "info"}>{e.totalPoints} pts</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </View>

        {/* Pagination */}
        <View className="flex flex-row items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-3">
          <Text className="text-xs font-mono text-muted-foreground">Showing {entries.length ? offset + 1 : 0}–{offset + entries.length} of {total}</Text>
          <View className="flex flex-row gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Prev</Button>
            <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Next</Button>
          </View>
        </View>
      </View>

      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}
