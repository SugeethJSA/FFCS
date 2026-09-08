"use client";
import { useEffect, useState } from "react";
import { View, Text, Card, CardContent, Button, Alert, Badge, Skeleton } from "@/lib/ui";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from "lucide-react";

export default function InPersonPublicPage() {
  const params = useParams() as { slug: string };
  const rawSlug = params.slug;
  const slug = rawSlug && rawSlug !== "placeholder" ? rawSlug : (typeof window !== "undefined" ? window.location.pathname.split("/").pop()?.split("?")[0] || "" : "");
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/attendance/in-person/${slug}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Event not found");
      setData(j.data);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) load();
  }, [slug]);

  const register = async () => {
    setBusy(true);
    setActionErr("");
    setActionMsg("");
    try {
      const res = await apiFetch(`/api/attendance/in-person/${slug}/register`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : JSON.stringify(j.error));
      setActionMsg(j.message || "Registration successful! Your attendee pass is ready below.");
      load();
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  if (loading) {
    return (
      <View className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </Card>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="min-h-screen flex flex-col items-center justify-center p-6 gap-4 bg-background text-center">
        <View className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="h-8 w-8" />
        </View>
        <Text className="text-2xl font-bold">Event Not Found</Text>
        <Text className="text-sm text-muted-foreground max-w-sm">
          The event slug might be incorrect, expired, or the backend server is unreachable.
        </Text>
        {actionErr && <Alert variant="error" className="max-w-md"><Text className="text-sm">{actionErr}</Text></Alert>}
        <Button size="sm" onClick={() => router.push("/")} className="mt-2">Back to Homepage</Button>
      </View>
    );
  }

  const { event, myStatus } = data;
  const isClosed = event.status === "CLOSED" || !!event.endTime;
  const qrPayload = myStatus?.hasRegistered && myStatus?.userId ? JSON.stringify({ eventId: event.id, userId: myStatus.userId }) : "";
  const qrUrl = qrPayload ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}` : "";

  return (
    <View className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <View className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-xs font-black text-primary-foreground tracking-wider">FFCS</span>
            </div>
            <div>
              <Text className="text-sm font-bold leading-none">FFCS Attendance</Text>
              <Text className="text-[11px] text-muted-foreground leading-none mt-1">Official Event Pass</Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge size="sm" variant={isClosed ? "default" : "success"} className="gap-1.5 py-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isClosed ? "bg-muted-foreground" : "bg-emerald-500 animate-pulse"}`} />
              {isClosed ? "Event Closed" : "Open for Check-In"}
            </Badge>
          </div>
        </div>

        {/* Main Event Card */}
        <Card variant="glass" className="overflow-hidden border-border/80 shadow-xl relative backdrop-blur-xl">
          <div className="h-2 w-full bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" size="sm" className="font-semibold">In-Person Session</Badge>
                {event.category?.name && (
                  <Badge variant="default" size="sm" className="font-mono text-[11px]">
                    {event.category.name}
                  </Badge>
                )}
                <Badge variant="default" size="sm" className="ml-auto font-mono text-[11px] gap-1">
                  <Users className="h-3 w-3 inline" />
                  {event.presentCount}/{event.totalCount} Registered
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{event.title}</h1>
            </div>

            {/* Event Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {event.startTime && (
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>{new Date(event.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {event.venue && (
                <div className="sm:col-span-2 flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="font-medium text-foreground">{event.venue}</span>
                </div>
              )}
            </div>

            {event.allowedEmailDomains?.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Restricted to emails ending in: <strong className="font-mono text-foreground">{event.allowedEmailDomains.join(", ")}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>

        {actionErr && (
          <Alert variant="error" className="animate-in fade-in slide-in-from-top-1">
            <Text className="text-sm">{actionErr}</Text>
          </Alert>
        )}
        {actionMsg && (
          <Alert variant="success" className="animate-in fade-in slide-in-from-top-1">
            <Text className="text-sm">{actionMsg}</Text>
          </Alert>
        )}

        {/* Member State Section */}
        {!user ? (
          <Card className="border-primary/30 shadow-lg bg-card/90">
            <CardContent className="p-6 sm:p-8 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <Text className="text-lg font-bold text-foreground">Sign in to register for this event</Text>
                <Text className="text-xs text-muted-foreground max-w-md mx-auto">
                  Log in with your registered college email. Your attendance will directly credit points to your FFCS profile.
                </Text>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto pt-2">
                <Button className="w-full" onClick={() => router.push(`/login?next=/in-person/${slug}`)}>
                  Sign in
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/register?next=/in-person/${slug}`)}>
                  Create account
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isClosed ? (
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-6 text-center space-y-2">
              <Text className="text-base font-bold text-muted-foreground">Registrations Closed</Text>
              <Text className="text-xs text-muted-foreground">
                This session has officially concluded. If you attended and your points were not credited, please contact a club administrator.
              </Text>
            </CardContent>
          </Card>
        ) : myStatus?.hasCheckedIn ? (
          /* Checked In State */
          <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-xl shadow-emerald-500/5">
            <CardContent className="p-6 sm:p-8 text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 animate-in zoom-in-50 duration-300" />
              </div>
              <div className="space-y-1">
                <Text className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Attendance Confirmed!</Text>
                <Text className="text-sm text-foreground font-medium">
                  You are officially checked into this event.
                </Text>
                {myStatus.checkInTime && (
                  <Text className="text-xs text-muted-foreground font-mono">
                    Verified at: {new Date(myStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Text>
                )}
              </div>
              <div className="pt-3">
                <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")}>
                  View Your Points Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : myStatus?.hasRegistered ? (
          /* Registered - Show QR Code */
          <Card className="border-primary/40 shadow-xl bg-card">
            <CardContent className="p-6 sm:p-8 space-y-6 text-center">
              <div className="space-y-1">
                <Badge variant="success" size="sm" className="mb-1">Registration Active</Badge>
                <Text className="text-xl font-black tracking-tight text-foreground">Your Event QR Pass</Text>
                <Text className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Present this QR code to the event coordinator at the door to have your attendance scanned and recorded.
                </Text>
              </div>

              {/* Elevated QR Container with frame */}
              <div className="relative inline-block mx-auto p-4 rounded-3xl bg-white shadow-xl border-4 border-primary/20">
                <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] flex items-center justify-center overflow-hidden">
                  <img
                    src={qrUrl}
                    alt="Attendee QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-mono text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Scan at desk
                </div>
              </div>

              {/* Action Buttons: Copy Payload & Open Image */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyPayload(qrPayload)}
                  className="gap-1.5 text-xs font-mono"
                >
                  {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedPayload ? "Payload Copied" : "Copy QR String"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(qrUrl, "_blank")}
                  className="gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Enlarge QR
                </Button>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-left space-y-1">
                <Text className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Attendee Credentials:</Text>
                <Text className="text-xs font-mono font-medium break-all text-foreground">
                  {user.displayName} · {user.email}
                </Text>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Not registered yet */
          <Card className="border-border shadow-lg">
            <CardContent className="p-6 sm:p-8 space-y-5 text-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <Text className="text-lg font-bold text-foreground">Confirm Your Attendance</Text>
                <Text className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click below to generate your unique verified attendance pass for this session.
                </Text>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border border-border/50 text-xs text-muted-foreground space-y-1">
                <p>Registering as: <strong className="text-foreground">{user.displayName}</strong> ({user.email})</p>
                {(user as any).registerNo ? (
                  <p className="font-mono text-[11px] text-primary">Reg No: {(user as any).registerNo}</p>
                ) : (
                  <p className="text-[11px] text-amber-500 font-medium">⚠️ No Reg No found on profile. Contact admin if required for grading.</p>
                )}
              </div>

              <Button onClick={register} disabled={busy} className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20">
                <View className="flex-row items-center justify-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <Text className="font-semibold">{busy ? "Registering pass…" : "Register & Get QR Pass"}</Text>
                </View>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Organizer Quick Card */}
        <Card variant="outline" className="border-dashed">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Share2 className="h-3 w-3" /> Event Share Link
              </Text>
              <Text className="text-xs text-muted-foreground">
                Share this link with attendees for quick check-in or open scanner as organizer.
              </Text>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5 text-xs">
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? "Link Copied" : "Copy Link"}
              </Button>
              {user?.role === "ADMIN" && (
                <Button size="sm" variant="secondary" onClick={() => router.push("/admin/attendance/scan")} className="gap-1.5 text-xs">
                  <QrCode className="h-3.5 w-3.5" />
                  Open Scanner
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
