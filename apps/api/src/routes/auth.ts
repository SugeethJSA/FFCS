import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken, hashToken } from "../lib/auth";
import { registerSchema, loginSchema, refreshSchema } from "../utils/zod";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const { email, username, displayName, password } = parsed.data;

  // Check for placeholder user created via FFCS import (isActive=false) – allow claim by email or vitEmail
  const placeholder = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { vitEmail: email }],
      isActive: false,
    },
  });

  if (placeholder) {
    // Ensure requested username is not taken by another active user (excluding placeholder itself)
    const usernameTaken = await prisma.user.findFirst({
      where: { username, NOT: { id: placeholder.id } },
      select: { id: true },
    });
    if (usernameTaken) {
      return res.status(409).json({ success: false, error: "username already taken" });
    }
    const passwordHash = await hashPassword(password);
    const claimed = await prisma.user.update({
      where: { id: placeholder.id },
      data: {
        email,
        vitEmail: placeholder.vitEmail || email,
        username,
        displayName,
        passwordHash,
        isActive: true,
      },
      select: { id: true, email: true, username: true, displayName: true, role: true, totalPoints: true, createdAt: true },
    });
    const accessToken = signAccessToken({ sub: claimed.id, username: claimed.username, role: claimed.role });
    const { raw: refreshToken } = await createRefreshToken(claimed.id);
    return res.status(200).json({ success: true, data: { user: claimed, accessToken, refreshToken, claimed: true } });
  }

  // Normal uniqueness check for active users
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true, isActive: true },
  });
  if (exists) {
    const field = exists.email === email ? "email" : "username";
    // If existing is inactive placeholder but vitEmail differs, give helpful message
    if (!exists.isActive) {
      return res.status(409).json({ success: false, error: `${field} belongs to an inactive placeholder. Try logging in with that email or contact admin.` });
    }
    return res.status(409).json({ success: false, error: `${field} already taken` });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, username, displayName, passwordHash },
    select: { id: true, email: true, username: true, displayName: true, role: true, totalPoints: true, createdAt: true },
  });

  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
  const { raw: refreshToken } = await createRefreshToken(user.id);

  return res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const { login, password } = parsed.data;
  const isEmail = login.includes("@");

  const lowerLogin = login.toLowerCase();
  const user = await prisma.user.findFirst({
    where: isEmail
      ? { OR: [{ email: lowerLogin }, { vitEmail: lowerLogin }] }
      : { username: lowerLogin },
  });
  if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });
  if (!user.isActive) return res.status(401).json({ success: false, error: "Account inactive — complete registration via 'claim' or contact admin" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, error: "Invalid credentials" });

  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
  const { raw: refreshToken } = await createRefreshToken(user.id);

  // optional: purge old expired tokens for this user keep table small
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  });

  return res.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role, totalPoints: user.totalPoints, avatarUrl: user.avatarUrl },
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "refreshToken required" });

  const result = await rotateRefreshToken(parsed.data.refreshToken);
  if (!result) return res.status(401).json({ success: false, error: "Invalid or expired refresh token" });

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user || !user.isActive) return res.status(401).json({ success: false, error: "User not found or disabled" });

  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });

  return res.json({ success: true, data: { accessToken, refreshToken: result.raw } });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await revokeRefreshToken(String(refreshToken));
  return res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, username: true, displayName: true, role: true, totalPoints: true, avatarUrl: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  // rank
  const rank = await prisma.user.count({ where: { totalPoints: { gt: user.totalPoints } } }).then(c => c + 1);

  // breakdown by category
  const breakdown = await prisma.point.groupBy({
    by: ["categoryId"],
    where: { recipientId: user.id },
    _sum: { amount: true },
  });
  const cats = await prisma.category.findMany({ where: { id: { in: breakdown.map(b => b.categoryId) } } });
  const catMap = new Map(cats.map(c => [c.id, c]));

  return res.json({
    success: true,
    data: {
      user,
      rank,
      breakdown: breakdown.map(b => ({
        category: catMap.get(b.categoryId),
        total: b._sum.amount || 0,
      })),
    },
  });
});

export default router;
