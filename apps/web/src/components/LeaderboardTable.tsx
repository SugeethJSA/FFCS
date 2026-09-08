"use client";
import { useEffect, useState, useMemo } from "react";
import { View, Text, Input, Badge, Skeleton, Button, OptionPicker, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/lib/ui";
import { apiFetch } from "@/lib/api";
import { Search, Trophy, Medal, Crown, X, Star, Sparkles, User, Award, Shield, CheckCircle2 } from "lucide-react";

interface Entry {
  rank: number;
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null; totalPoints: number; role?: string };
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
  const [selectedMember, setSelectedMember] = useState<Entry | null>(null);

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

  const maxPoints = useMemo(() => {
    if (!entries.length) return 1;
    return Math.max(...entries.map((e) => e.totalPoints), 1);
  }, [entries]);

  function rankIcon(rank: number) {
    if (rank === 1) return <Crown className="h-4 w-4 text-amber-400 animate-pulse" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-300" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    if (rank <= 10) return <Star className="h-3.5 w-3.5 text-primary/70" />;
    return null;
  }

  return (
    <View className="space-y-6">
      {/* Category Pills & Search Controls */}
      <View className="space-y-3">
        <View className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <View className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or @username…"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              className="pl-10 pr-9 bg-card/70 border-border/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </View>

          <View className="flex flex-row items-center gap-2 self-end sm:self-auto">
            {categories.length > 0 && (
              <OptionPicker
                value={category}
                onChange={(v) => setCategory(v === "all" ? "" : v)}
                options={[{ value: "all", label: "All categories" }, ...categories.map(c => ({ value: c.slug, label: c.name }))]}
                className="w-[180px] sm:w-[200px]"
              />
            )}
            <Badge variant="info" className="font-mono text-xs shrink-0 py-1">
              {total} {total === 1 ? "member" : "members"}
            </Badge>
          </View>
        </View>

        {/* Quick-filter Category Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                category === ""
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "bg-card/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {categories.map((c) => {
              const active = category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(active ? "" : c.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                      : "bg-card/70 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </View>

      {/* Olympic Podium for Top 3 (shown on page 1 without active text search) */}
      {!loading && entries.length >= 3 && offset === 0 && !search && (
        <View className="relative pt-6 pb-2">
          <View className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end max-w-2xl mx-auto">
            {/* 2nd Place (Silver) */}
            {entries[1] && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMember(entries[1])}
                onKeyDown={(e) => e.key === "Enter" && setSelectedMember(entries[1])}
                className={`order-1 flex flex-col items-center rounded-2xl border border-slate-400/30 bg-gradient-to-b from-slate-400/10 via-card to-card p-3 sm:p-4 text-center cursor-pointer transition duration-200 hover:-translate-y-1 hover:border-slate-300 shadow-md ${
                  entries[1].isMe ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-xs">
                  2
                </div>
                <div className="mt-2.5 relative">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-slate-400/20 ring-2 ring-slate-300/60 flex items-center justify-center text-slate-200 font-bold text-base sm:text-lg">
                    {entries[1].user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-slate-300 drop-shadow-sm" />
                </div>
                <Text className="mt-2 text-xs sm:text-sm font-bold truncate max-w-full">
                  {entries[1].user.displayName}
                </Text>
                <Text className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate max-w-full">
                  @{entries[1].user.username}
                </Text>
                <Badge variant="info" size="sm" className="mt-2 font-mono font-bold text-[10px] sm:text-xs">
                  {entries[1].totalPoints} pts
                </Badge>
                <span className="mt-1 text-[10px] font-semibold text-slate-400">Silver</span>
              </div>
            )}

            {/* 1st Place (Gold - Elevated) */}
            {entries[0] && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMember(entries[0])}
                onKeyDown={(e) => e.key === "Enter" && setSelectedMember(entries[0])}
                className={`order-2 -mt-4 flex flex-col items-center rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/20 via-card to-card p-4 sm:p-5 text-center cursor-pointer transition duration-200 hover:-translate-y-1.5 hover:border-amber-400 shadow-xl shadow-amber-500/10 relative overflow-hidden ${
                  entries[0].isMe ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-20 w-20 rounded-full bg-amber-400/30 blur-xl pointer-events-none" />
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-amber-950 font-black text-sm shadow-md shadow-amber-500/30">
                  1
                </div>
                <div className="mt-2.5 relative">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-tr from-amber-500/30 to-yellow-400/20 ring-2 ring-amber-400 flex items-center justify-center text-amber-300 font-black text-lg sm:text-xl shadow-inner">
                    {entries[0].user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <Crown className="absolute -top-3.5 left-1/2 -translate-x-1/2 h-6 w-6 text-amber-400 animate-bounce" />
                </div>
                <Text className="mt-2 text-sm sm:text-base font-black truncate max-w-full text-foreground">
                  {entries[0].user.displayName}
                </Text>
                <Text className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate max-w-full">
                  @{entries[0].user.username}
                </Text>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-0.5 text-xs font-black text-amber-950 shadow-xs">
                  <Sparkles className="h-3 w-3" />
                  {entries[0].totalPoints} pts
                </div>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">Champion</span>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {entries[2] && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMember(entries[2])}
                onKeyDown={(e) => e.key === "Enter" && setSelectedMember(entries[2])}
                className={`order-3 flex flex-col items-center rounded-2xl border border-amber-800/40 bg-gradient-to-b from-amber-800/10 via-card to-card p-3 sm:p-4 text-center cursor-pointer transition duration-200 hover:-translate-y-1 hover:border-amber-700 shadow-md ${
                  entries[2].isMe ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-800 text-amber-100 font-black text-xs shadow-xs">
                  3
                </div>
                <div className="mt-2.5 relative">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-amber-800/20 ring-2 ring-amber-700/60 flex items-center justify-center text-amber-400 font-bold text-base sm:text-lg">
                    {entries[2].user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-600 drop-shadow-sm" />
                </div>
                <Text className="mt-2 text-xs sm:text-sm font-bold truncate max-w-full">
                  {entries[2].user.displayName}
                </Text>
                <Text className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate max-w-full">
                  @{entries[2].user.username}
                </Text>
                <Badge variant="info" size="sm" className="mt-2 font-mono font-bold text-[10px] sm:text-xs">
                  {entries[2].totalPoints} pts
                </Badge>
                <span className="mt-1 text-[10px] font-semibold text-amber-600">Bronze</span>
              </div>
            )}
          </View>
        </View>
      )}

      {/* Leaderboard Table */}
      <View className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-md backdrop-blur-xs">
        <View className="max-h-[640px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-md border-b border-border/70">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3.5 w-16 sm:w-20"># Rank</th>
                <th className="px-4 py-3.5">Member</th>
                <th className="px-4 py-3.5 text-right w-36 sm:w-48">Points &amp; Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5"><Skeleton className="h-5 w-8 rounded" /></td>
                    <td className="px-4 py-3.5">
                      <View className="flex flex-row items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <View className="space-y-1.5">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </View>
                      </View>
                    </td>
                    <td className="px-4 py-3.5 text-right"><Skeleton className="h-5 w-16 ml-auto rounded" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <View className="flex flex-col items-center justify-center gap-2">
                      <Trophy className="h-10 w-10 text-muted-foreground/30" />
                      <Text className="text-sm font-semibold">{error || "No members match this filter."}</Text>
                      {search && (
                        <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="mt-1">
                          Clear search
                        </Button>
                      )}
                    </View>
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const ratio = Math.round((e.totalPoints / maxPoints) * 100);
                  const isTop3 = e.rank <= 3;
                  return (
                    <tr
                      key={e.user.id}
                      onClick={() => setSelectedMember(e)}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-muted/50 ${
                        e.isMe ? "bg-primary/10 hover:bg-primary/15" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <View className="flex flex-row items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center font-mono text-xs font-black ${
                              e.rank === 1
                                ? "text-amber-400 font-extrabold text-sm"
                                : e.rank === 2
                                ? "text-slate-300 font-bold"
                                : e.rank === 3
                                ? "text-amber-600 font-bold"
                                : "text-muted-foreground"
                            }`}
                          >
                            #{e.rank}
                          </span>
                          {rankIcon(e.rank)}
                        </View>
                      </td>
                      <td className="px-4 py-3.5">
                        <View className="flex flex-row items-center gap-3">
                          <View
                            className={`h-9 w-9 overflow-hidden rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              e.rank === 1
                                ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/60"
                                : e.rank === 2
                                ? "bg-slate-400/20 text-slate-200 ring-1 ring-slate-300/50"
                                : e.rank === 3
                                ? "bg-amber-800/20 text-amber-400 ring-1 ring-amber-700/50"
                                : "bg-primary/15 text-primary"
                            }`}
                          >
                            {e.user.displayName.charAt(0).toUpperCase()}
                          </View>
                          <View className="min-w-0">
                            <View className="flex flex-row items-center gap-1.5 flex-wrap">
                              <Text className="font-bold text-foreground truncate max-w-[180px] sm:max-w-none">
                                {e.user.displayName}
                              </Text>
                              {e.isMe && <Badge variant="default" size="sm" className="text-[10px] py-0">You</Badge>}
                              {e.user.role === "ADMIN" && <Badge variant="info" size="sm" className="text-[10px] py-0">Admin</Badge>}
                            </View>
                            <Text className="text-xs font-mono text-muted-foreground">@{e.user.username}</Text>
                          </View>
                        </View>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <View className="flex flex-col items-end gap-1">
                          <Badge
                            variant={e.rank === 1 ? "default" : isTop3 ? "info" : "info"}
                            className="font-mono font-bold"
                          >
                            {e.totalPoints} pts
                          </Badge>
                          {/* Relative score bar */}
                          <div className="w-20 sm:w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                e.rank === 1
                                  ? "bg-amber-400"
                                  : isTop3
                                  ? "bg-violet-500"
                                  : "bg-primary/60"
                              }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </View>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </View>

        {/* Pagination Footer */}
        <View className="flex flex-row items-center justify-between gap-2 border-t border-border/80 bg-muted/30 px-4 py-3">
          <Text className="text-xs font-mono text-muted-foreground">
            Showing {entries.length ? offset + 1 : 0}–{offset + entries.length} of {total}
          </Text>
          <View className="flex flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => o + limit)}
            >
              Next
            </Button>
          </View>
        </View>
      </View>

      {/* Member Details Modal */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-row items-center gap-2 text-lg font-black">
                <User className="h-5 w-5 text-primary" />
                Member Profile
              </DialogTitle>
            </DialogHeader>

            <View className="space-y-4 pt-2">
              <View className="flex flex-row items-center gap-3.5 rounded-xl border border-border bg-muted/20 p-4">
                <View className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-lg">
                  {selectedMember.user.displayName.charAt(0).toUpperCase()}
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex flex-row items-center gap-2">
                    <Text className="text-base font-bold text-foreground truncate">
                      {selectedMember.user.displayName}
                    </Text>
                    {selectedMember.isMe && <Badge variant="default" size="sm">You</Badge>}
                  </View>
                  <Text className="text-xs font-mono text-muted-foreground">@{selectedMember.user.username}</Text>
                </View>
              </View>

              <View className="grid grid-cols-2 gap-3">
                <View className="rounded-xl border border-border bg-card p-3 text-center">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rank</Text>
                  <View className="mt-1 flex flex-row items-center justify-center gap-1.5">
                    <Text className="text-xl font-black">#{selectedMember.rank}</Text>
                    {rankIcon(selectedMember.rank)}
                  </View>
                </View>

                <View className="rounded-xl border border-border bg-card p-3 text-center">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points</Text>
                  <View className="mt-1 flex flex-row items-center justify-center gap-1">
                    <Text className="text-xl font-black text-primary">{selectedMember.totalPoints}</Text>
                    <Award className="h-4 w-4 text-primary" />
                  </View>
                </View>
              </View>

              <View className="rounded-xl border border-border/80 bg-muted/10 p-3 space-y-1 text-xs text-muted-foreground">
                <View className="flex flex-row items-center gap-1.5 text-foreground font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Verified Club Member</span>
                </View>
                <Text>
                  Points are awarded for verified hackathon wins, technical contributions, meeting attendance, and club activities.
                </Text>
              </View>

              <Button variant="outline" className="w-full" onClick={() => setSelectedMember(null)}>
                Close
              </Button>
            </View>
          </DialogContent>
        </Dialog>
      )}

      {error && <Text className="text-sm text-destructive font-semibold">{error}</Text>}
    </View>
  );
}

