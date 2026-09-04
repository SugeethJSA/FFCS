"use client";
import { View, Text } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import LeaderboardTable from "@/components/LeaderboardTable";

export default function LeaderboardPage() {
  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
        <View>
          <Text className="text-2xl font-black tracking-tight">Leaderboard</Text>
          <Text className="text-sm text-muted-foreground">Public ranking of all members by total points. Use search and category filters to explore.</Text>
        </View>
        <LeaderboardTable />
      </View>
    </View>
  );
}
