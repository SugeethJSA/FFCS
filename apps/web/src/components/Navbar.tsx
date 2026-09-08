"use client";
import { useState } from "react";
import { View, Text, Button, ThemeSwitcher, Badge } from "@/lib/ui";
import { useAuth } from "@/lib/auth";
import { Trophy, LogOut, LayoutDashboard, Shield, Download, Menu, X, CheckSquare, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  const navLinks = [
    { href: "/", label: "Leaderboard" },
    { href: "/leaderboard", label: "Full Board" },
    { href: "/download", label: "App & Tools", icon: Download },
  ];

  return (
    <View className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl transition-all">
      <View className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo / Brand */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/")}
          className="group flex cursor-pointer flex-row items-center gap-2.5 transition focus:outline-none"
        >
          <View className="relative">
            <View className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-primary to-violet-500 opacity-30 blur-md transition duration-300 group-hover:opacity-75" />
            <View className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-600 text-primary-foreground shadow-md shadow-primary/20">
              <Trophy className="h-5 w-5 transition duration-300 group-hover:scale-110" />
            </View>
          </View>
          <View className="flex flex-col">
            <View className="flex flex-row items-center gap-1.5">
              <Text className="text-base font-black tracking-tight">FFCS</Text>
              <Badge variant="info" size="sm" className="hidden text-[10px] sm:inline-flex px-1.5 py-0 h-4">Club</Badge>
            </View>
            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Points Portal</Text>
          </View>
        </div>

        {/* Desktop Navigation Links */}
        <View className="hidden md:flex flex-row items-center gap-1">
          {navLinks.map((n) => {
            const isActive = pathname === n.href;
            return (
              <Button
                key={n.href}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(n.href)}
                className={`transition-all ${isActive ? "bg-muted font-bold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <View className="flex-row items-center gap-1.5">
                  {n.icon && <n.icon className="h-3.5 w-3.5" />}
                  <Text className="text-sm">{n.label}</Text>
                </View>
              </Button>
            );
          })}
        </View>

        {/* Right Side Desktop Actions */}
        <View className="hidden md:flex flex-row items-center gap-2">
          {user ? (
            <>
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate("/dashboard")}
                className={pathname === "/dashboard" ? "bg-muted font-bold" : ""}
              >
                <View className="flex-row items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <Text>Dashboard</Text>
                </View>
              </Button>

              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <>
                  <Button
                    variant={pathname === "/admin" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className={pathname === "/admin" ? "bg-muted font-bold" : ""}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Shield className="h-4 w-4 text-violet-500" />
                      <Text>Award</Text>
                    </View>
                  </Button>
                  <Button
                    variant={pathname.startsWith("/admin/attendance") ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/admin/attendance")}
                    className={pathname.startsWith("/admin/attendance") ? "bg-muted font-bold" : ""}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                      <Text>Attendance</Text>
                    </View>
                  </Button>
                </>
              )}

              {/* User badge */}
              <View className="flex flex-row items-center gap-2 rounded-full border border-border/80 bg-card/80 py-1 pl-1 pr-3 shadow-xs">
                <View className="h-7 w-7 overflow-hidden rounded-full bg-gradient-to-tr from-primary/20 to-violet-500/20 ring-1 ring-primary/30 flex items-center justify-center">
                  <Text className="text-xs font-black text-primary">{user.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex flex-col">
                  <View className="flex flex-row items-center gap-1">
                    <Text className="text-xs font-bold leading-tight max-w-[110px] truncate">{user.displayName}</Text>
                    {user.role === "ADMIN" && <Badge size="sm" variant="info" className="text-[9px] px-1 py-0 h-3.5">Admin</Badge>}
                  </View>
                  <Text className="text-[10px] font-mono font-medium text-muted-foreground">{user.totalPoints} pts</Text>
                </View>
              </View>

              <Button
                variant="ghost"
                size="icon"
                title="Log out"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <View className="flex flex-row items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Log in</Button>
              <Button size="sm" onClick={() => navigate("/register")} className="shadow-xs shadow-primary/25">
                <View className="flex-row items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <Text className="font-semibold">Join</Text>
                </View>
              </Button>
            </View>
          )}

          <View className="ml-1 pl-2 border-l border-border/60">
            <ThemeSwitcher />
          </View>
        </View>

        {/* Mobile Header Right: Theme + Hamburger Toggle */}
        <View className="flex md:hidden flex-row items-center gap-1.5">
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="rounded-xl border border-border/60"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </View>
      </View>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <View className="border-b border-border/80 bg-background/95 p-4 backdrop-blur-2xl md:hidden animate-fadeIn space-y-4 shadow-xl">
          {user && (
            <View className="flex flex-row items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
              <View className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-sm">
                {user.displayName.charAt(0).toUpperCase()}
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex flex-row items-center gap-2">
                  <Text className="text-sm font-bold truncate">{user.displayName}</Text>
                  <Badge variant="info" size="sm">{user.role}</Badge>
                </View>
                <Text className="text-xs font-mono text-muted-foreground">@{user.username} · {user.totalPoints} points</Text>
              </View>
            </View>
          )}

          <View className="flex flex-col gap-1">
            {navLinks.map((n) => (
              <Button
                key={n.href}
                variant={pathname === n.href ? "secondary" : "ghost"}
                className="justify-start text-sm py-2.5"
                onClick={() => navigate(n.href)}
              >
                <View className="flex-row items-center gap-2">
                  {n.icon && <n.icon className="h-4 w-4" />}
                  <Text>{n.label}</Text>
                </View>
              </Button>
            ))}

            {user ? (
              <>
                <Button
                  variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                  className="justify-start text-sm py-2.5"
                  onClick={() => navigate("/dashboard")}
                >
                  <View className="flex-row items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <Text>Dashboard</Text>
                  </View>
                </Button>

                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <>
                    <Button
                      variant={pathname === "/admin" ? "secondary" : "ghost"}
                      className="justify-start text-sm py-2.5"
                      onClick={() => navigate("/admin")}
                    >
                      <View className="flex-row items-center gap-2">
                        <Shield className="h-4 w-4 text-violet-500" />
                        <Text>Award Points (Admin)</Text>
                      </View>
                    </Button>
                    <Button
                      variant={pathname.startsWith("/admin/attendance") ? "secondary" : "ghost"}
                      className="justify-start text-sm py-2.5"
                      onClick={() => navigate("/admin/attendance")}
                    >
                      <View className="flex-row items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-emerald-500" />
                        <Text>Attendance & QR</Text>
                      </View>
                    </Button>
                  </>
                )}

                <View className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 py-2.5"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                      router.push("/login");
                    }}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <Text>Log out</Text>
                    </View>
                  </Button>
                </View>
              </>
            ) : (
              <View className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => navigate("/login")}>Log in</Button>
                <Button onClick={() => navigate("/register")}>Join Now</Button>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

