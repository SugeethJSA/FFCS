"use client";
import { View, Text, Button, Card, CardContent, Badge } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import LeaderboardTable from "@/components/LeaderboardTable";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, BarChart3, Users } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <View className="relative overflow-hidden border-b border-border">
        <View className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_40%_at_50%_-10%,#000_60%,transparent_100%)] pointer-events-none" />
        <View className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <View className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <View className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <View className="max-w-3xl space-y-4">
            <Badge variant="info" className="gap-1.5">
              <Sparkles className="h-3 w-3" /> FFCS Club • Live Leaderboard
            </Badge>
            <Text className="text-3xl font-black tracking-tight sm:text-4xl">Earn points. Climb the board. Get recognized.</Text>
            <Text className="text-base text-muted-foreground sm:text-lg">Every event, contribution and win is tracked. Log in to see exactly what you earned, where you earned it, and how — with a complete history and category breakdown.</Text>
            <View className="flex flex-wrap gap-3 pt-2">
              {!user ? (
                <>
                  <Button size="lg" onClick={() => router.push("/register")}><Text className="font-semibold">Create account</Text></Button>
                  <Button size="lg" variant="outline" onClick={() => router.push("/login")}>Log in</Button>
                </>
              ) : (
                <Button size="lg" onClick={() => router.push("/dashboard")}>Go to my dashboard</Button>
              )}
              <Button size="lg" variant="ghost" onClick={() => router.push("/leaderboard")}>View full board</Button>
            </View>
          </View>

          {/* Feature cards */}
          <View className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BarChart3, title: "Your earning breakdown", desc: "Points per category, timeline and totals" },
              { icon: ShieldCheck, title: "Secure & fair", desc: "Hashed passwords, JWT, role-based awards" },
              { icon: Users, title: "Team-wide transparency", desc: "Public leaderboard, audited history" },
            ].map((f) => (
              <Card key={f.title} variant="glass" className="p-4">
                <View className="flex flex-row items-center gap-3">
                  <View className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold">{f.title}</Text>
                    <Text className="text-xs text-muted-foreground">{f.desc}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </View>

      {/* Leaderboard preview */}
      <View className="mx-auto w-full max-w-6xl px-4 py-8">
        <View className="mb-4 flex flex-row items-center justify-between">
          <Text className="text-lg font-bold tracking-tight">Live Leaderboard</Text>
          <Button variant="ghost" size="sm" onClick={() => router.push("/leaderboard")}>Full view →</Button>
        </View>
        <LeaderboardTable />
        <Card variant="outline" className="mt-6">
          <CardContent className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How points work</Text>
            <Text className="mt-1 text-sm text-muted-foreground">Admins award points per category (Event, Technical, Volunteering, Outreach, Wins, Workshops). Each award records the reason, place (where) and method (how) so your history is fully auditable. Totals update instantly and ties are ranked by earliest activity.</Text>
          </CardContent>
        </Card>
      </View>

      <View className="mt-auto border-t border-border py-6 text-center">
        <Text className="text-xs text-muted-foreground">© {new Date().getFullYear()} FFCS Club • Built with AmazeUI</Text>
      </View>
    </View>
  );
}
