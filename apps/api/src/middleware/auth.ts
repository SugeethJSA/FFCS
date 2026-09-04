import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../lib/auth";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: AccessTokenPayload & { id: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing Authorization header" });
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { ...payload, id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Array<"MEMBER" | "ADMIN" | "SUPER_ADMIN">) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }
    next();
  };
}

// Optional auth – populates req.user if token present, but never rejects
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice(7));
      req.user = { ...payload, id: payload.sub };
    } catch {
      // ignore
    }
  }
  next();
}

// Fetch full user from DB (useful to check isActive)
export async function attachDbUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isActive: true, role: true } });
  if (!dbUser || !dbUser.isActive) {
    return res.status(403).json({ success: false, error: "Account disabled" });
  }
  // sync role if changed
  if (dbUser.role !== req.user.role) {
    return res.status(401).json({ success: false, error: "Role changed – please re-login" });
  }
  next();
}
