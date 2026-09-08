"use client";
import { useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, AtSign, Mail, Lock, Eye, EyeOff, CheckCircle2, Circle, Sparkles, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasLength = form.password.length >= 8;
  const hasUpper = /[A-Z]/.test(form.password);
  const hasLower = /[a-z]/.test(form.password);
  const hasNumber = /[0-9]/.test(form.password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber;

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background ambient lighting */}
        <View className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_50%_at_50%_40%,#000_60%,transparent_100%)] pointer-events-none opacity-40" />
        <View className="absolute top-1/4 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <View className="absolute bottom-1/4 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <Card className="w-full max-w-lg relative border-border/80 shadow-2xl backdrop-blur-xl bg-card/80 my-8" variant="glass">
          <CardContent className="p-8 sm:p-10 space-y-6">
            {/* Header */}
            <View className="text-center space-y-2">
              <View className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto shadow-sm">
                <UserPlus className="h-6 w-6" />
              </View>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Join FFCS</Text>
              <Text className="text-sm text-muted-foreground">Create your member account to start earning club points</Text>
            </View>

            {error && (
              <Alert variant="error" className="animate-in fade-in slide-in-from-top-1 duration-200">
                <Text className="text-sm whitespace-pre-wrap">{error}</Text>
              </Alert>
            )}

            <form onSubmit={handle} className="space-y-4">
              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" /> Full / Display Name
                </Label>
                <Input
                  required
                  value={form.displayName}
                  onChange={(e: any) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Priya Nair"
                  className="h-11 bg-background/50 focus:bg-background transition-colors"
                />
              </View>

              <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <AtSign className="h-3 w-3 text-muted-foreground" /> Username
                  </Label>
                  <Input
                    required
                    value={form.username}
                    onChange={(e: any) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                    placeholder="priyanair"
                    className="h-11 lowercase bg-background/50 focus:bg-background transition-colors"
                  />
                </View>

                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground" /> Password
                  </Label>
                  <div className="relative">
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e: any) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
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
              </View>

              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" /> Email Address
                </Label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e: any) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@vitstudent.ac.in"
                  className="h-11 bg-background/50 focus:bg-background transition-colors"
                />
              </View>

              {/* Password criteria checklist */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <Text className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Password strength requirement:</Text>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                    {hasLength ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-50" />}
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                    {hasUpper ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-50" />}
                    <span>1+ uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                    {hasLower ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-50" />}
                    <span>1+ lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                    {hasNumber ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-50" />}
                    <span>1+ numeric digit</span>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 mt-2">
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="font-semibold">{loading ? "Creating account…" : "Create account"}</Text>
                  {!loading && <Sparkles className="h-4 w-4" />}
                </View>
              </Button>
            </form>

            <View className="pt-2 text-center border-t border-border/50">
              <Text className="text-xs text-muted-foreground">
                Already registered?{" "}
                <a href="/login" className="font-semibold text-primary underline-offset-4 hover:underline transition-colors">
                  Log in to your account
                </a>
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
