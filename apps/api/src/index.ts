import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth";
import leaderboardRoutes from "./routes/leaderboard";
import pointsRoutes from "./routes/points";
import adminRoutes from "./routes/admin";
import membersRoutes from "./routes/members";
import attendanceRoutes from "./routes/attendance";
import { generalLimiter, authLimiter, awardLimiter } from "./lib/rateLimit";
import { prisma } from "./lib/prisma";
import { purgeExpiredTokens } from "./lib/auth";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);

// ── Security middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// CORS – allow listed origins or all in dev
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / mobile
    if (CORS_ORIGINS.length === 0) return cb(null, true); // allow all if not configured (dev)
    if (CORS_ORIGINS.includes(origin) || CORS_ORIGINS.includes("*")) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
}));

// Trust proxy (Render / Fly / Vercel)
app.set("trust proxy", 1);

// General rate limiter (skip health)
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/api/health") return next();
  return generalLimiter(req, res, next);
});

// ── Health ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ success: true, message: "FFCS backend healthy", uptime: process.uptime() }));
app.get("/api/health", (_req, res) => res.json({ success: true, message: "OK", timestamp: new Date().toISOString() }));
app.get("/", (_req, res) => res.json({ success: true, message: "FFCS API – see /api/health, /api/leaderboard" }));

// ── Routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/admin", awardLimiter, adminRoutes);
app.use("/api/admin/members", membersRoutes);
app.use("/api/attendance", attendanceRoutes);

// Also expose categories publicly without admin prefix
app.get("/api/categories", async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, data: cats });
});

// ── 404 ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: "Not found" }));

// ── Error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[FFCS] Unhandled error:", err?.message || err);
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ success: false, error: "CORS: Origin not allowed" });
  }
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" && status === 500
    ? "Internal server error"
    : err.message || "Internal server error";
  res.status(status).json({ success: false, error: message });
});

// ── Start ─────────────────────────────────────────────────────────────
async function start() {
  try {
    await prisma.$connect();
    console.log("[FFCS] Prisma connected");
  } catch (e) {
    console.warn("[FFCS] Prisma connect failed (will retry on request):", (e as Error).message);
  }

  // purge expired tokens every hour
  setInterval(() => {
    purgeExpiredTokens().catch(() => {});
  }, 60 * 60 * 1000);
  // initial purge
  purgeExpiredTokens().catch(() => {});

  app.listen(PORT, () => {
    console.log(`[FFCS] Backend listening on http://localhost:${PORT}`);
    if (CORS_ORIGINS.length === 0) console.warn("[FFCS] CORS_ORIGIN not set – allowing all origins (dev mode)");
    else console.log(`[FFCS] CORS origins: ${CORS_ORIGINS.join(", ")}`);
  });
}

start();

// Graceful shutdown
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });
