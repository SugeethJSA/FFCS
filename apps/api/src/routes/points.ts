import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/points/me – authenticated user's own history, paginated
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1), 100);
  const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);

  const [points, total] = await Promise.all([
    prisma.point.findMany({
      where: { recipientId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        category: true,
        awardedBy: { select: { id: true, username: true, displayName: true } },
      },
    }),
    prisma.point.count({ where: { recipientId: req.user!.id } }),
  ]);

  // compute per-category totals for header stats
  const grouped = await prisma.point.groupBy({
    by: ["categoryId"],
    where: { recipientId: req.user!.id },
    _sum: { amount: true },
    _count: { id: true },
  });
  const cats = await prisma.category.findMany({ where: { id: { in: grouped.map(g => g.categoryId) } } });
  const catMap = new Map(cats.map(c => [c.id, c]));

  return res.json({
    success: true,
    data: {
      points,
      total,
      limit,
      offset,
      stats: grouped.map(g => ({
        category: catMap.get(g.categoryId),
        total: g._sum.amount || 0,
        count: g._count.id,
      })),
    },
  });
});

// GET /api/points/me/stats – quick dashboard (must be before /user/:username)
router.get("/me/stats", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const [userAgg, recent, breakdown] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }),
    prisma.point.findMany({ where: { recipientId: userId }, orderBy: { createdAt: "desc" }, take: 5, include: { category: true } }),
    prisma.point.groupBy({ by: ["categoryId"], where: { recipientId: userId }, _sum: { amount: true } }),
  ]);

  const totalPoints = userAgg?.totalPoints ?? 0;
  const rank = (await prisma.user.count({ where: { totalPoints: { gt: totalPoints } } })) + 1;

  const cats = await prisma.category.findMany({ where: { id: { in: breakdown.map(b => b.categoryId) } } });
  const catMap = new Map(cats.map(c => [c.id, c]));

  return res.json({
    success: true,
    data: {
      totalPoints,
      rank,
      recent,
      breakdown: breakdown.map(b => ({ category: catMap.get(b.categoryId), total: b._sum.amount || 0 })),
    },
  });
});

// GET /api/points/user/:username – public profile points
router.get("/user/:username", async (req, res) => {
  const username = String((req.params as any).username);
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, username: true, displayName: true, avatarUrl: true, totalPoints: true } });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1), 50);
  const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);

  const [points, total] = await Promise.all([
    prisma.point.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { category: true, awardedBy: { select: { username: true, displayName: true } } },
    }),
    prisma.point.count({ where: { recipientId: user.id } }),
  ]);

  return res.json({ success: true, data: { user, points, total, limit, offset } });
});

export default router;
