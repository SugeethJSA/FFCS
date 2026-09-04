"use client";
import { View, Text, Button, ThemeSwitcher } from "@/lib/ui";
import { useAuth } from "@/lib/auth";
import { Trophy, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Leaderboard" },
  { href: "/leaderboard", label: "Full Board" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <View className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <View className="flex flex-row items-center gap-2">
          <View className="relative">
            <View className="absolute inset-0 rounded-xl bg-primary/20 blur-md" />
            <View className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Trophy className="h-5 w-5" />
            </View>
          </View>
          <Text className="hidden text-sm font-black tracking-tight sm:block">FFCS</Text>
          <Text className="hidden text-xs font-bold uppercase tracking-widest text-muted-foreground sm:block">Club Points</Text>
        </View>

        <View className="flex flex-row items-center gap-1">
          {NAV.map((n) => (
            <Button key={n.href} variant={pathname === n.href ? "secondary" : "ghost"} size="sm" onClick={() => router.push(n.href)}>
              <Text className="text-sm font-medium">{n.label}</Text>
            </Button>
          ))}
          {user ? (
            <>
              <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} size="sm" onClick={() => router.push("/dashboard")}>
                <View className="flex-row items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  <Text className="hidden sm:inline">Dashboard</Text>
                </View>
              </Button>
              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <>
                  <Button variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm" onClick={() => router.push("/admin")}>
                    <View className="flex-row items-center gap-1.5">
                      <Shield className="h-4 w-4" />
                      <Text className="hidden sm:inline">Admin</Text>
                    </View>
                  </Button>
                  <Button variant={pathname.startsWith("/admin/attendance") ? "secondary" : "ghost"} size="sm" onClick={() => router.push("/admin/attendance")}>
                    <Text className="hidden sm:inline">Attendance</Text>
                  </Button>
                </>
              )}
              <View className="hidden sm:flex flex-row items-center gap-2 rounded-full border border-border bg-card px-2 py-1 ml-2">
                <View className="h-6 w-6 overflow-hidden rounded-full bg-primary/15 flex items-center justify-center">
                  <Text className="text-xs font-bold text-primary">{user.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex flex-col pr-1">
                  <Text className="text-xs font-semibold leading-none">{user.displayName}</Text>
                  <Text className="text-[10px] font-mono text-muted-foreground">@{user.username} · {user.totalPoints} pts</Text>
                </View>
              </View>
              <Button variant="ghost" size="icon" onClick={async () => { await logout(); router.push("/login"); }} className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>Log in</Button>
              <Button size="sm" onClick={() => router.push("/register")}>Join</Button>
            </>
          )}
          <ThemeSwitcher />
        </View>
      </View>
    </View>
  );
}
