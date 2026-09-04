import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { awardSchema, categorySchema } from "../utils/zod";

const router = Router();

// All admin routes require auth + ADMIN or SUPER_ADMIN
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

// POST /api/admin/award
router.post("/award", async (req: AuthRequest, res) => {
  const parsed = awardSchema.safeParse({ ...req.body, amount: req.body.amount ? Number(req.body.amount) : undefined });
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const { recipientUsername, recipientEmail, recipientId, amount, reason, where, how, categorySlug, categoryId, metadata } = parsed.data;

  // resolve category
  let catId = categoryId;
  if (!catId && categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!cat) return res.status(404).json({ success: false, error: "Category not found" });
    catId = cat.id;
  }

  // resolve recipient
  let recipient: { id: string } | null = null;
  if (recipientId) recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  else if (recipientEmail) recipient = await prisma.user.findUnique({ where: { email: recipientEmail.toLowerCase() }, select: { id: true } });
  else if (recipientUsername) recipient = await prisma.user.findUnique({ where: { username: recipientUsername.toLowerCase() }, select: { id: true } });

  if (!recipient) return res.status(404).json({ success: false, error: "Recipient not found" });

  // Prevent awarding to self? allow but log; optionally block
  // if (recipient.id === req.user!.id) return res.status(400).json({ success: false, error: "Cannot award points to yourself" });

  const point = await prisma.$transaction(async (tx) => {
    const p = await tx.point.create({
      data: {
        recipientId: recipient!.id,
        awardedById: req.user!.id,
        amount,
        reason,
        where,
        how,
        categoryId: catId!,
        metadata: metadata as any,
      },
      include: { category: true, recipient: { select: { username: true, displayName: true } } },
    });
    await tx.user.update({ where: { id: recipient!.id }, data: { totalPoints: { increment: amount } } });
    return p;
  });

  return res.status(201).json({ success: true, data: point });
});

// DELETE /api/admin/point/:id – revoke a point (refund)
router.delete("/point/:id", async (req: AuthRequest, res) => {
  const id = String((req.params as any).id);
  const point = await prisma.point.findUnique({ where: { id } });
  if (!point) return res.status(404).json({ success: false, error: "Point entry not found" });

  // Only SUPER_ADMIN or original awarder can revoke within 30 days? enforce SUPER_ADMIN for simplicity
  if (req.user!.role !== "SUPER_ADMIN" && point.awardedById !== req.user!.id) {
    return res.status(403).json({ success: false, error: "Only SUPER_ADMIN or original awarder can revoke" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.point.delete({ where: { id } });
    await tx.user.update({ where: { id: point.recipientId }, data: { totalPoints: { decrement: point.amount } } });
  });

  // clamp negative (in case data inconsistency)
  await prisma.user.updateMany({ where: { totalPoints: { lt: 0 } }, data: { totalPoints: 0 } });

  return res.json({ success: true, message: "Point revoked and balance adjusted" });
});

// GET /api/admin/users – searchable user list
router.get("/users", async (req, res) => {
  const search = req.query.search ? String(req.query.search).trim() : "";
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1), 100);
  const where: any = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
    ];
  }
  const users = await prisma.user.findMany({
    where,
    take: limit,
    orderBy: { totalPoints: "desc" },
    select: { id: true, username: true, displayName: true, email: true, role: true, totalPoints: true, createdAt: true },
  });
  res.json({ success: true, data: users });
});

// Category CRUD (admin)
router.get("/categories", async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, data: cats });
});

router.post("/categories", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
  try {
    const cat = await prisma.category.create({ data: parsed.data });
    return res.status(201).json({ success: true, data: cat });
  } catch (e: any) {
    if (e.code === "P2002") return res.status(409).json({ success: false, error: "Slug or name already exists" });
    throw e;
  }
});

router.delete("/categories/:id", async (req: AuthRequest, res) => {
  if (req.user!.role !== "SUPER_ADMIN") return res.status(403).json({ success: false, error: "Only SUPER_ADMIN can delete categories" });
  const id = String((req.params as any).id);
  const count = await prisma.point.count({ where: { categoryId: id } });
  if (count > 0) return res.status(400).json({ success: false, error: "Cannot delete category with existing points" });
  await prisma.category.delete({ where: { id } });
  return res.json({ success: true, message: "Category deleted" });
});

export default router;
