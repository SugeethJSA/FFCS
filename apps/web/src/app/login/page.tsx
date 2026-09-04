"use client";
import { useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(loginVal, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="flex-1 flex items-center justify-center p-4 relative">
        <View className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_60%_at_50%_-10%,#000_60%,transparent_100%)] pointer-events-none" />
        <Card className="w-full max-w-sm relative" variant="glass">
          <CardContent className="p-8 space-y-6">
            <View className="text-center space-y-2">
              <Text className="text-2xl font-black tracking-tight">Welcome back</Text>
              <Text className="text-sm text-muted-foreground">Log in to see your points & history</Text>
            </View>
            {error && <Alert variant="error"><Text className="text-sm">{error}</Text></Alert>}
            <form onSubmit={handle} className="space-y-4">
              <View className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email or username</Label>
                <Input required value={loginVal} onChange={(e: any) => setLoginVal(e.target.value)} placeholder="you@vitstudent.ac.in or username" autoComplete="username" />
              </View>
              <View className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input required type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              </View>
              <Button type="submit" disabled={loading} className="w-full">
                <View className="flex-row items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <Text className="font-semibold">{loading ? "Signing in…" : "Sign in"}</Text>
                </View>
              </Button>
            </form>
            <Text className="text-center text-xs text-muted-foreground">No account? <a href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">Create one</a></Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
