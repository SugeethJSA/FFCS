"use client";
import { useState } from "react";
import { View, Text, Card, CardContent, Input, Label, Button, Alert } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="flex-1 flex items-center justify-center p-4 relative">
        <View className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_60%_at_50%_-10%,#000_60%,transparent_100%)] pointer-events-none" />
        <Card className="w-full max-w-md relative" variant="glass">
          <CardContent className="p-8 space-y-6">
            <View className="text-center space-y-1">
              <Text className="text-2xl font-black tracking-tight">Join FFCS</Text>
              <Text className="text-sm text-muted-foreground">Create your member account to start earning points</Text>
            </View>
            {error && <Alert variant="error"><Text className="text-sm whitespace-pre-wrap">{error}</Text></Alert>}
            <form onSubmit={handle} className="space-y-4">
              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Display name</Label>
                <Input required value={form.displayName} onChange={(e: any) => setForm({ ...form, displayName: e.target.value })} placeholder="Priya Nair" />
              </View>
              <View className="grid grid-cols-2 gap-3">
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Username</Label>
                  <Input required value={form.username} onChange={(e: any) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="priyanair" className="lowercase" />
                </View>
                <View className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Password</Label>
                  <Input required type="password" value={form.password} onChange={(e: any) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                </View>
              </View>
              <View className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Email</Label>
                <Input required type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} placeholder="you@vitstudent.ac.in" />
              </View>
              <Text className="text-[11px] text-muted-foreground">Password must be 8+ chars with upper, lower & number. Your password is hashed with bcrypt (cost 12) and never stored in plain text.</Text>
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating…" : "Create account"}</Button>
            </form>
            <Text className="text-center text-xs text-muted-foreground">Already have an account? <a href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Log in</a></Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
