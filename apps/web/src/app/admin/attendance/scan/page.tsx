"use client";
import { useEffect, useRef, useState } from "react";
import { View, Text, Card, CardContent, Button, Alert, Badge, Input, Label } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { QrCode, Camera, CheckCircle2, ArrowLeft, RefreshCw, Smartphone } from "lucide-react";

export default function ScanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/attendance/in-person")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setEvents(j.data);
          if (j.data.length > 0 && !slug) setSlug(j.data[0].slug);
        }
      })
      .catch(() => {});
  }, [user]);

  const doCheckin = async (payload: { userId: string; eventId?: string; slug?: string }) => {
    setError("");
    setResult("");
    try {
      let targetSlug = slug;
      if (payload.slug) targetSlug = payload.slug;
      if (!targetSlug && payload.eventId) {
        const ev = events.find((e) => e.id === payload.eventId);
        if (ev) targetSlug = ev.slug;
      }
      if (!targetSlug) throw new Error("Please select an active In-Person event first");

      const res = await apiFetch(`/api/attendance/in-person/${targetSlug}/checkin`, {
        method: "POST",
        body: JSON.stringify({ userId: payload.userId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error));
      setResult(`✓ Verified & Checked in: ${payload.userId} to ${targetSlug}!`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const obj = JSON.parse(scanInput.trim());
      await doCheckin(obj);
      setScanInput("");
    } catch {
      if (scanInput.trim()) {
        await doCheckin({ userId: scanInput.trim() });
        setScanInput("");
      }
    }
  };

  const startScanner = async () => {
    setError("");
    setResult("");
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const id = "ffcs-qr-reader";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        document.getElementById("qr-container")?.appendChild(el);
      }
      const h = new Html5Qrcode(id);
      scannerRef.current = h;
      await h.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          try {
            const obj = JSON.parse(decoded);
            await doCheckin(obj);
          } catch {
            await doCheckin({ userId: decoded });
          }
        },
        () => {}
      );
    } catch (e: any) {
      setError(e.message || "Camera access failed or permission denied — use manual input below");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {}
    setScanning(false);
  };

  if (authLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return (
      <View className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <View className="p-12 text-center">
          <Text className="text-sm text-muted-foreground">Checking administrator permissions…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <View className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-row items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <QrCode className="h-5 w-5" />
              </div>
              <Text className="text-2xl sm:text-3xl font-black tracking-tight">QR Check-in Scanner</Text>
              <Badge variant="info" size="sm">Admin Camera HUD</Badge>
            </div>
            <Text className="text-xs sm:text-sm text-muted-foreground">
              Scan attendee QR codes from /in-person/[slug] to verify attendance in real-time.
            </Text>
          </div>

          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/attendance")}>
            <View className="flex-row items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <Text>Attendance List</Text>
            </View>
          </Button>
        </div>

        <Card className="border-border/80 bg-card/80 shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Event Selector */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                Target In-Person Event *
              </Label>
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/90 px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose active event --</option>
                {events.map((e: any) => (
                  <option key={e.slug} value={e.slug}>
                    {e.title} (/in-person/{e.slug}) • {e._count?.attendees ?? e.present ?? 0} checked in
                  </option>
                ))}
              </select>
              {!events.length && (
                <Text className="text-xs text-muted-foreground">
                  No active in-person events found. Create one from Attendance → New Session.
                </Text>
              )}
            </div>

            {error && <Alert variant="error"><Text className="text-sm">{error}</Text></Alert>}
            {result && (
              <Alert variant="success">
                <div className="flex flex-row items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <Text className="text-sm font-bold">{result}</Text>
                </div>
              </Alert>
            )}

            {/* Viewfinder and Manual Section */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Camera Scanner Reticle Viewfinder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-primary" /> Camera Viewfinder
                  </Text>
                  {scanning && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Scanning Live
                    </span>
                  )}
                </div>

                {/* Viewfinder Container */}
                <div className="relative rounded-2xl border-2 border-dashed border-border/80 bg-black/40 min-h-[280px] flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Targeting Corners */}
                  <div className="absolute top-2.5 left-2.5 h-4 w-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-2.5 right-2.5 h-4 w-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-2.5 left-2.5 h-4 w-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-2.5 right-2.5 h-4 w-4 border-b-2 border-r-2 border-primary" />

                  {/* Animated laser beam */}
                  {scanning && (
                    <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-md shadow-emerald-400/80 animate-scan-laser z-20 pointer-events-none" />
                  )}

                  <div id="qr-container" className="w-full flex items-center justify-center">
                    {!scanning && (
                      <div className="p-6 text-center space-y-2">
                        <Smartphone className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <Text className="text-xs text-muted-foreground">
                          Click below to activate rear camera. Hold attendee QR badge within frame.
                        </Text>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-row gap-2 pt-1">
                  {!scanning ? (
                    <Button size="sm" onClick={startScanner} disabled={!slug} className="w-full shadow-xs">
                      <Camera className="h-4 w-4 mr-1.5" /> Start Camera
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={stopScanner} className="w-full">
                      Stop Camera
                    </Button>
                  )}
                </div>
              </div>

              {/* Manual Entry Fallback */}
              <div className="space-y-3 sm:border-l sm:border-border/60 sm:pl-6">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-primary" /> Manual Check-in
                </Text>
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  If the attendee's phone screen is dim or damaged, paste their QR JSON payload or plain User ID below.
                </Text>

                <form onSubmit={handleManual} className="space-y-3 pt-1">
                  <Input
                    value={scanInput}
                    onChange={(e: any) => setScanInput(e.target.value)}
                    placeholder='{"eventId":"...","userId":"..."} or User ID'
                    className="font-mono text-xs"
                  />
                  <Button type="submit" size="sm" className="w-full" disabled={!slug || !scanInput.trim()}>
                    Manual Check In
                  </Button>
                </form>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  <Text className="text-[11px] font-bold text-foreground">Attendee Instructions</Text>
                  <Text className="text-[10px] text-muted-foreground leading-relaxed">
                    Attendees open <span className="font-mono">/in-person/[slug]</span> on their mobile device and tap "Register" to generate their personal QR code.
                  </Text>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

