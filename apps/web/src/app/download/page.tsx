"use client";
import { View, Text, Card, CardContent, Button, Badge } from "@/lib/ui";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";

export default function DownloadPage(){
  const [os,setOs]=useState<string>("unknown");
  useEffect(()=>{
    const ua = navigator.userAgent.toLowerCase();
    if(ua.includes("win")) setOs("windows");
    else if(ua.includes("mac")) setOs("mac");
    else if(ua.includes("linux")) setOs("linux");
  },[]);

  const dl = (platform:string)=>{
    // In dev, point to local build; in prod, GitHub Releases
    const base = "https://github.com/AmazeContinuityProjects/FFCS/releases/latest";
    if(platform==="windows") return `${base}/download/FFCS_Track_1.0.0_x64_en-US.msi`;
    if(platform==="mac") return `${base}/download/FFCS_Track_1.0.0_x64.dmg`;
    if(platform==="linux") return `${base}/download/FFCS_Track_1.0.0_amd64.AppImage`;
    return base;
  };

  return (
    <View className="min-h-screen flex flex-col bg-background">
      <Navbar/>
      <View className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        <View>
          <Text className="text-3xl font-black">Download FFCS Track</Text>
          <Text className="text-sm text-muted-foreground">One installer · auto-updates · includes Meet tracker + QR scanner.</Text>
          <Badge variant="info" className="mt-2">Detected: {os}</Badge>
        </View>

        <View className="grid gap-3 sm:grid-cols-3">
          {[
            { id:"windows", label:"Windows", ext:".msi / .exe", icon:"🪟" },
            { id:"mac", label:"macOS", ext:".dmg", icon:"🍎" },
            { id:"linux", label:"Linux", ext:".AppImage/.deb", icon:"🐧" },
          ].map(p=>(
            <Card key={p.id} variant={os===p.id? "glass":"outline"} className="p-4 text-center">
              <Text className="text-2xl">{p.icon}</Text>
              <Text className="text-sm font-bold mt-1">{p.label}</Text>
              <Text className="text-xs text-muted-foreground">{p.ext}</Text>
              <Button size="sm" className="mt-3 w-full" onClick={()=>window.open(dl(p.id),"_blank")}>Download</Button>
            </Card>
          ))}
        </View>

        <Card>
          <CardContent className="p-6 space-y-3">
            <Text className="text-sm font-bold">Or install Chrome Extension only</Text>
            <Text className="text-xs text-muted-foreground">If you don't want the desktop app, just use the Meet tracker in Chrome.</Text>
            <View className="flex flex-row gap-2">
              <Button size="sm" variant="outline" onClick={()=>window.open("https://chrome.google.com/webstore/detail/ffcs-track","_blank")}>Chrome Web Store</Button>
              <Button size="sm" variant="ghost" onClick={()=>window.open("https://github.com/AmazeContinuityProjects/FFCS/tree/main/ffcs-extension","_blank")}>Load unpacked (dev)</Button>
            </View>
            <Text className="text-xs font-mono bg-muted rounded p-2">chrome://extensions → Developer mode → Load unpacked → FFCS/ffcs-extension</Text>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardContent className="p-4 space-y-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">After install</Text>
            <Text className="text-xs text-muted-foreground">1) Login at /admin/attendance as ADMIN → 2) For Meet: join meet.google.com/* → see 🔴 FFCS Tracking → Stop & Upload → 3) For In-Person: /admin/attendance/new → share /in-person/[slug] → scan at /admin/attendance/scan → compare vs FFCS master → Award points.</Text>
            <Text className="text-xs text-muted-foreground">Tokens sync via localStorage ffcs_access → chrome.storage for Meet page. Set ffcs_api_base if backend not on localhost:4000.</Text>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
