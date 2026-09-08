"use client";
import { View, Text, Badge, Button } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import LeaderboardTable from "@/components/LeaderboardTable";
import { Trophy, Sparkles, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const router = useRouter();

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <View className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
          <View className="space-y-1.5">
            <View className="flex flex-row items-center gap-2">
              <View className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <Trophy className="h-5 w-5" />
              </View>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight">Full Leaderboard</Text>
              <Badge variant="info" size="sm" className="gap-1">
                <Sparkles className="h-3 w-3" /> Live
              </Badge>
            </View>
            <Text className="text-sm text-muted-foreground max-w-xl">
              Official public standings of all club members. Filter by category, search specific members, or click on any row to inspect details.
            </Text>
          </View>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="self-start sm:self-auto">
            <View className="flex-row items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <Text>Back to Home</Text>
            </View>
          </Button>
        </View>

        <LeaderboardTable />
      </View>
    </View>
  );
}

