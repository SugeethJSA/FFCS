import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_\-]+$/, "Username may only contain letters, numbers, _ and -").toLowerCase(),
  displayName: z.string().min(2).max(50).trim(),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain a number"),
});

export const loginSchema = z.object({
  login: z.string().min(1).max(254), // email or username
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const awardSchema = z.object({
  // recipient identifier – one of these required
  recipientUsername: z.string().min(1).max(30).optional(),
  recipientEmail: z.string().email().optional(),
  recipientId: z.string().cuid().optional(),
  amount: z.number().int().min(1).max(1000),
  reason: z.string().min(3).max(500).trim(),
  where: z.string().max(200).trim().optional(),
  how: z.string().max(500).trim().optional(),
  categorySlug: z.string().min(1).max(50).optional(),
  categoryId: z.string().cuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(d => d.recipientUsername || d.recipientEmail || d.recipientId, {
  message: "Provide recipientUsername, recipientEmail or recipientId",
}).refine(d => d.categorySlug || d.categoryId, {
  message: "Provide categorySlug or categoryId",
});

export const categorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9\-]+$/),
  description: z.string().max(300).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(30).optional(),
});
