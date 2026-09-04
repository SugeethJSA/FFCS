import { Router } from "express";
import { prisma } from "../lib/prisma";
import { optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/leaderboard
 * Query: limit (1-100), offset, category (slug), from (ISO), to (ISO), search (username/displayName)
 * Public – optionalAuth highlights current user rank.
 * If category/from/to filters applied, points are computed dynamically (not using denormalized totalPoints).
 */
router.get("/", optionalAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 100);
  const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
  const categorySlug = req.query.category ? String(req.query.category) : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const hasPointFilters = !!categorySlug || !!from || !!to;

  if (!hasPointFilters) {
    // Fast path – use denormalized totalPoints
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ totalPoints: "desc" }, { createdAt: "asc" }],
        take: limit,
        skip: offset,
        select: { id: true, username: true, displayName: true, avatarUrl: true, totalPoints: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    // compute ranks – handle ties by previous total? Simple offset rank
    const results = users.map((u, idx) => ({
      rank: offset + idx + 1,
      user: u,
      totalPoints: u.totalPoints,
      isMe: req.user ? req.user.id === u.id : false,
    }));

    // if authenticated, also return my rank if not in page
    let myRank: number | null = null;
    let myEntry: any = null;
    if (req.user) {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { totalPoints: true } });
      if (me) {
        myRank = (await prisma.user.count({ where: { isActive: true, totalPoints: { gt: me.totalPoints } } })) + 1;
        const inPage = results.some(r => r.user.id === req.user!.id);
        if (!inPage && myRank) {
          const meFull = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, username: true, displayName: true, avatarUrl: true, totalPoints: true, createdAt: true },
          });
          if (meFull) myEntry = { rank: myRank, user: meFull, totalPoints: meFull.totalPoints, isMe: true };
        }
      }
    }

    return res.json({ success: true, data: { leaderboard: results, total, limit, offset, myRank, myEntry } });
  }

  // Filtered – dynamic aggregation
  let categoryId: string | undefined;
  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!cat) return res.status(404).json({ success: false, error: "Category not found" });
    categoryId = cat.id;
  }

  const pointWhere: any = {};
  if (categoryId) pointWhere.categoryId = categoryId;
  if (from || to) {
    pointWhere.createdAt = {};
    if (from && !isNaN(from.getTime())) pointWhere.createdAt.gte = from;
    if (to && !isNaN(to.getTime())) pointWhere.createdAt.lte = to;
  }

  // Aggregate per recipient
  const grouped = await prisma.point.groupBy({
    by: ["recipientId"],
    where: pointWhere,
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Filter by user search if needed – we need user map
  let filtered: any = grouped;
  const userIds = grouped.map((g: any) => g.recipientId);
  const usersMap = new Map<string, any>(
    (await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
    })).map((u: any) => [u.id, u])
  );

  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter((g: any) => {
      const u: any = usersMap.get(g.recipientId);
      if (!u) return false;
      return u.username.toLowerCase().includes(lower) || u.displayName.toLowerCase().includes(lower);
    });
  } else {
    // remove inactive / missing
    filtered = filtered.filter(g => usersMap.has(g.recipientId));
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  const leaderboard = page.map((g: any, idx: number) => {
    const u: any = usersMap.get(g.recipientId)!;
    return {
      rank: offset + idx + 1,
      user: { ...u, totalPoints: g._sum.amount || 0 },
      totalPoints: g._sum.amount || 0,
      isMe: req.user ? req.user.id === g.recipientId : false,
    };
  });

  return res.json({ success: true, data: { leaderboard, total, limit, offset } });
});

/**
 * GET /api/leaderboard/categories – helper to list categories for filter UI
 */
router.get("/categories", async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, data: cats });
});

export default router;
