"use client";
import { View, Text, Button, Card, CardContent, Badge } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import LeaderboardTable from "@/components/LeaderboardTable";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, BarChart3, Users, ArrowRight, Trophy, QrCode, Award } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <View className="relative overflow-hidden border-b border-border/70">
        <View className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_50%_at_50%_-10%,#000_70%,transparent_100%)] pointer-events-none" />
        <View className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
        <View className="absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-[120px] pointer-events-none" />

        <View className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <View className="max-w-3xl space-y-5">
            {/* Live Indicator Chip */}
            <View className="flex flex-row items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                FFCS Club • Live Leaderboard Portal
              </span>
              <Badge variant="default" size="sm" className="hidden sm:inline-flex">Season Active</Badge>
            </View>

            {/* Headline */}
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Earn points. <br />
              <span className="bg-gradient-to-r from-primary via-violet-500 to-indigo-400 bg-clip-text text-transparent">
                Climb the board.
              </span><br />
              Get recognized.
            </h1>

            {/* Subtitle */}
            <Text className="text-base text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
              Every hackathon, workshop, club activity, and contribution is tracked. Log in to see where and how you earned points with fully auditable history and category breakdowns.
            </Text>

            {/* CTAs */}
            <View className="flex flex-wrap items-center gap-3 pt-2">
              {!user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => router.push("/register")}
                    className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition"
                  >
                    <View className="flex-row items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <Text className="font-semibold">Join FFCS Club</Text>
                    </View>
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => router.push("/login")}>
                    Member Sign In
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                  className="shadow-lg shadow-primary/25"
                >
                  <View className="flex-row items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    <Text className="font-semibold">Go to My Dashboard</Text>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </View>
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={() => router.push("/leaderboard")}>
                Explore Full Rankings →
              </Button>
            </View>

            {/* Highlights Bar */}
            <View className="pt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
              <View className="flex flex-row items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>Olympic Podium</span>
              </View>
              <span>•</span>
              <View className="flex flex-row items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-emerald-500" />
                <span>In-Person QR Check-in</span>
              </View>
              <span>•</span>
              <View className="flex flex-row items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-violet-500" />
                <span>Audited Metadata</span>
              </View>
            </View>
          </View>

          {/* Feature Grid */}
          <View className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Personalized Breakdown",
                desc: "Real-time analytics per category with timeline visualizer and milestone progress.",
                color: "from-blue-500/20 to-cyan-500/20 text-blue-500",
              },
              {
                icon: ShieldCheck,
                title: "Audited & Transparent",
                desc: "Every point logs the reason, venue (where), and achievement method (how).",
                color: "from-emerald-500/20 to-teal-500/20 text-emerald-500",
              },
              {
                icon: Users,
                title: "Community Recognition",
                desc: "Public rankings, instant ties resolution, and club-wide leaderboard visibility.",
                color: "from-amber-500/20 to-orange-500/20 text-amber-500",
              },
            ].map((f) => (
              <Card
                key={f.title}
                variant="glass"
                className="p-5 border-border/80 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <View className="flex flex-row items-start gap-3.5">
                  <View className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${f.color} ring-1 ring-border/50`}>
                    <f.icon className="h-5 w-5" />
                  </View>
                  <View className="space-y-1">
                    <Text className="text-sm font-bold text-foreground">{f.title}</Text>
                    <Text className="text-xs text-muted-foreground leading-relaxed">{f.desc}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </View>

      {/* Live Leaderboard Section */}
      <View className="mx-auto w-full max-w-6xl px-4 py-10">
        <View className="mb-6 flex flex-row items-center justify-between">
          <View className="space-y-1">
            <View className="flex flex-row items-center gap-2">
              <Text className="text-xl font-black tracking-tight">Live Rankings</Text>
              <Badge variant="info" size="sm">Top Earners</Badge>
            </View>
            <Text className="text-xs text-muted-foreground">Updated in real-time as points are awarded across all active categories.</Text>
          </View>
          <Button variant="outline" size="sm" onClick={() => router.push("/leaderboard")}>
            Full board →
          </Button>
        </View>

        <LeaderboardTable />

        <Card variant="outline" className="mt-8 border-border/80 bg-card/50">
          <CardContent className="p-5">
            <View className="flex flex-row items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How Points Work</Text>
            </View>
            <Text className="text-xs text-muted-foreground leading-relaxed">
              Admins award points across official club categories: Event Attendance, Technical Projects, Volunteering, Outreach, Wins, and Workshops. Each entry includes audited reasons, physical/virtual venues, and specific contributions so members have a verifiable record for portfolios and club certifications.
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/70 py-8 bg-background/50 backdrop-blur-xs">
        <View className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <View className="flex flex-col sm:flex-row items-center gap-2">
            <View className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Trophy className="h-3.5 w-3.5" />
            </View>
            <Text className="text-xs font-semibold">FFCS Points Leaderboard</Text>
            <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
            <Text className="text-xs text-muted-foreground">Official club portal for members & organizers</Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FFCS Club • Built with AmazeUI
          </Text>
        </View>
      </footer>
    </View>
  );
}

