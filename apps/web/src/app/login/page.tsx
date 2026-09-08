"use client";
import { useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(loginVal, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background glow & grid */}
        <View className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_50%_at_50%_40%,#000_60%,transparent_100%)] pointer-events-none opacity-40" />
        <View className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <View className="absolute bottom-1/3 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

        <Card className="w-full max-w-md relative border-border/80 shadow-2xl backdrop-blur-xl bg-card/80" variant="glass">
          <CardContent className="p-8 sm:p-10 space-y-6">
            {/* Header */}
            <View className="text-center space-y-2">
              <View className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </View>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Welcome back</Text>
              <Text className="text-sm text-muted-foreground">Sign in to check your leaderboard rank & activity points</Text>
            </View>

            {error && (
              <Alert variant="error" className="animate-in fade-in slide-in-from-top-1 duration-200">
                <Text className="text-sm">{error}</Text>
              </Alert>
            )}

            <form onSubmit={handle} className="space-y-4">
              <View className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" /> Email or Username
                </Label>
                <Input
                  required
                  value={loginVal}
                  onChange={(e: any) => setLoginVal(e.target.value)}
                  placeholder="you@vitstudent.ac.in or username"
                  autoComplete="username"
                  className="h-11 bg-background/50 focus:bg-background transition-colors"
                />
              </View>

              <View className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground" /> Password
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11 bg-background/50 focus:bg-background transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </View>

              <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold mt-2 shadow-lg shadow-primary/20">
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="font-semibold">{loading ? "Signing in…" : "Sign in to FFCS"}</Text>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </View>
              </Button>
            </form>

            {/* Footer switcher */}
            <View className="pt-2 text-center border-t border-border/50">
              <Text className="text-xs text-muted-foreground">
                Don't have an account yet?{" "}
                <a href="/register" className="font-semibold text-primary underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1">
                  Create an account <Sparkles className="h-3 w-3 inline" />
                </a>
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
