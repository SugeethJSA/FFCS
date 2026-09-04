import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "./prisma";

// ── Password ────────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT ─────────────────────────────────────────────────────────────────
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be >= 32 chars. Set in env.");
  return s;
}

export interface AccessTokenPayload {
  sub: string; // user id
  username: string;
  role: "MEMBER" | "ADMIN" | "SUPER_ADMIN";
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: (process.env.JWT_ACCESS_EXPIRES as any) || "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
}

// ── Refresh token (opaque, stored hashed) ───────────────────────────────
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex"); // 96 chars
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(userId: string): Promise<{ raw: string; expiresAt: Date }> {
  const raw = generateRefreshToken();
  const tokenHash = hashToken(raw);
  const days = parseInt(process.env.REFRESH_TOKEN_DAYS || "7", 10);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { raw, expiresAt };
}

export async function rotateRefreshToken(oldRaw: string): Promise<{ raw: string; userId: string } | null> {
  const oldHash = hashToken(oldRaw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!existing || existing.revoked || existing.expiresAt < new Date()) return null;

  // revoke old
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });

  const { raw } = await createRefreshToken(existing.userId);
  return { raw, userId: existing.userId };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const h = hashToken(raw);
  await prisma.refreshToken.updateMany({ where: { tokenHash: h }, data: { revoked: true } });
}

// Periodic cleanup – call on startup interval
export async function purgeExpiredTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] },
  });
}
