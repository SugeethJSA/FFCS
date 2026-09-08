"use client";
import { View, Text, Card, CardContent, Button, Badge } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";
import {
  Download,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Monitor,
  Layers,
  Cpu
} from "lucide-react";

export default function DownloadPage() {
  const [os, setOs] = useState<string>("unknown");
  const [copiedExtensionPath, setCopiedExtensionPath] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) setOs("windows");
    else if (ua.includes("mac")) setOs("mac");
    else if (ua.includes("linux")) setOs("linux");
  }, []);

  const dl = (platform: string) => {
    const base = "https://github.com/AmazeContinuityProjects/FFCS/releases/latest";
    if (platform === "windows") return `${base}/download/FFCS_Track_1.0.0_x64_en-US.msi`;
    if (platform === "mac") return `${base}/download/FFCS_Track_1.0.0_x64.dmg`;
    if (platform === "linux") return `${base}/download/FFCS_Track_1.0.0_amd64.AppImage`;
    return base;
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText("chrome://extensions");
    setCopiedExtensionPath(true);
    setTimeout(() => setCopiedExtensionPath(false), 2000);
  };

  const platforms = [
    {
      id: "windows",
      label: "Windows",
      arch: "x64 (Windows 10 / 11)",
      ext: ".msi / .exe installer",
      icon: (
        <svg className="h-8 w-8 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.751" />
        </svg>
      )
    },
    {
      id: "mac",
      label: "macOS",
      arch: "Universal (Apple Silicon & Intel)",
      ext: ".dmg disk image",
      icon: (
        <svg className="h-8 w-8 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.41c.64-.78 1.08-1.86.96-2.94-1 .04-2.13.67-2.79 1.44-.57.65-1.07 1.74-.94 2.79 1.11.09 2.16-.57 2.77-1.29z" />
        </svg>
      )
    },
    {
      id: "linux",
      label: "Linux",
      arch: "x86_64 AppImage & .deb",
      ext: ".AppImage / .deb",
      icon: (
        <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.012 0c-3.414 0-5.46 2.052-5.46 5.253 0 .749.117 1.767.351 2.997-.563.488-1.565 1.543-1.879 2.502-.455 1.388.064 2.825.922 3.125.109.844.372 1.636.786 2.378-1.386 1.488-2.617 3.33-2.617 4.908 0 1.987 1.833 2.837 4.298 2.837.744 0 1.56-.086 2.418-.255.857.169 1.674.255 2.418.255 2.465 0 4.298-.85 4.298-2.837 0-1.578-1.231-3.42-2.617-4.908.414-.742.677-1.534.786-2.378.858-.3 1.377-1.737.922-3.125-.314-.959-1.316-2.014-1.879-2.502.234-1.23.351-2.248.351-2.997C17.472 2.052 15.426 0 12.012 0z" />
        </svg>
      )
    }
  ];

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <View className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>FFCS Track Suite v1.0.0 · Production Ready</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Download FFCS Track
          </h1>
          <p className="text-base text-muted-foreground">
            Automated Google Meet attendance recording, rapid QR scanner, and seamless leaderboard synchronization.
          </p>
          {os !== "unknown" && (
            <div className="pt-1">
              <Badge variant="info" size="sm" className="font-mono text-xs">
                Auto-detected: {os.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>

        {/* Platform Download Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {platforms.map((p) => {
            const isMatch = os === p.id;
            return (
              <Card
                key={p.id}
                variant={isMatch ? "glass" : "outline"}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  isMatch ? "border-primary/60 ring-2 ring-primary/20 shadow-lg shadow-primary/5" : "border-border/70 hover:border-border"
                }`}
              >
                {isMatch && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm">
                    Recommended
                  </div>
                )}
                <CardContent className="p-6 text-center space-y-4 flex flex-col items-center justify-between h-full">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50">
                    {p.icon}
                  </div>
                  <div className="space-y-1">
                    <Text className="text-lg font-bold text-foreground">{p.label}</Text>
                    <Text className="text-xs text-muted-foreground">{p.arch}</Text>
                    <Badge variant="default" size="sm" className="font-mono text-[10px]">
                      {p.ext}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className={`w-full gap-2 font-semibold ${isMatch ? "shadow-md shadow-primary/20" : ""}`}
                    variant={isMatch ? "default" : "secondary"}
                    onClick={() => window.open(dl(p.id), "_blank")}
                  >
                    <Download className="h-4 w-4" />
                    Download for {p.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Chrome Extension Section */}
        <Card variant="glass" className="overflow-hidden border-border/80 shadow-xl backdrop-blur-xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-primary" />
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <Text className="text-lg font-bold text-foreground">Google Chrome Extension</Text>
                  <Badge variant="warning" size="sm">Browser Add-on</Badge>
                </div>
                <Text className="text-xs text-muted-foreground">
                  Lightweight browser extension specifically for logging Google Meet attendees with zero desktop install.
                </Text>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  className="gap-2 shrink-0 w-full sm:w-auto font-semibold"
                  onClick={() => window.open("https://chrome.google.com/webstore/detail/ffcs-track", "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Chrome Web Store
                </Button>
              </div>
            </div>

            {/* Developer Mode Step-by-Step Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-primary" /> Developer / Unpacked Installation
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPath}
                  className="h-7 text-xs gap-1 font-mono text-muted-foreground hover:text-foreground"
                >
                  {copiedExtensionPath ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copiedExtensionPath ? "Copied" : "Copy extensions URL"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="p-3 bg-background/60 rounded-xl border border-border/40 space-y-1">
                  <span className="font-mono text-primary font-bold">01. Open Settings</span>
                  <p>Navigate to <span className="font-mono text-foreground font-semibold">chrome://extensions</span> in your Chrome address bar.</p>
                </div>
                <div className="p-3 bg-background/60 rounded-xl border border-border/40 space-y-1">
                  <span className="font-mono text-primary font-bold">02. Enable Dev Mode</span>
                  <p>Toggle on the <strong className="text-foreground">Developer mode</strong> switch in the top-right corner.</p>
                </div>
                <div className="p-3 bg-background/60 rounded-xl border border-border/40 space-y-1">
                  <span className="font-mono text-primary font-bold">03. Load Unpacked</span>
                  <p>Click <strong className="text-foreground">Load unpacked</strong> and select the repository's <span className="font-mono text-foreground">ffcs-extension</span> folder.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3-Step Workflow Guide */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <Text className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">Workflow Guide</Text>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">How FFCS Track Works</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black font-mono">
                  1
                </div>
                <Text className="text-base font-bold text-foreground">Sign In & Sync</Text>
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  Log in as an Admin on the FFCS portal. The desktop app and extension automatically sync your credentials securely via local storage.
                </Text>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black font-mono">
                  2
                </div>
                <Text className="text-base font-bold text-foreground">Capture Attendance</Text>
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  Join any Google Meet or scan attendee QR codes in real-time at in-person events. The system tracks active minutes and presence tokens.
                </Text>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black font-mono">
                  3
                </div>
                <Text className="text-base font-bold text-foreground">Award & Rank</Text>
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  Upload the session report, verify against the FFCS master list, and award points idempotently to update member leaderboard rankings instantly.
                </Text>
              </CardContent>
            </Card>
          </div>
        </div>
      </View>
    </View>
  );
}
