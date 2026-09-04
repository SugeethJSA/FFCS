import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { normalizeRegisterNo } from "../utils/parseRegNo";
import bcrypt from "bcryptjs";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Helper to normalize CSV header keys
function normKey(k: string): string {
  return String(k).trim().toLowerCase().replace(/\s+/g, " ").replace(/_/g, " ");
}

function findCol(row: Record<string, any>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  const normMap = new Map(keys.map(k => [normKey(k), k]));
  for (const c of candidates) {
    const nk = normKey(c);
    if (normMap.has(nk)) return normMap.get(nk);
  }
  // fuzzy contains
  for (const c of candidates) {
    const nk = normKey(c);
    for (const [kNorm, orig] of normMap) {
      if (kNorm.includes(nk) || nk.includes(kNorm)) return orig;
    }
  }
  return undefined;
}

// POST /api/admin/members/import
router.post("/import", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded (field name 'file')" });

  const originalName = req.file.originalname || "upload.csv";
  const content = req.file.buffer.toString("utf-8");

  let records: Record<string, any>[];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (e: any) {
    return res.status(400).json({ success: false, error: "CSV parse failed: " + e.message });
  }

  if (!records.length) return res.status(400).json({ success: false, error: "CSV is empty" });

  // detect required columns
  const sample = records[0];
  const programmeCol = findCol(sample, ["programme", "program", "course"]);
  const regNoCol = findCol(sample, ["register no", "register number", "reg no", "regno", "reg number", "register_no"]);
  const nameCol = findCol(sample, ["name", "student name"]);
  const schoolCol = findCol(sample, ["school", "dept", "department"]);
  const emailCol = findCol(sample, ["email", "e-mail", "mail"]);
  const mobileCol = findCol(sample, ["mob no", "mobile", "phone", "mob", "contact"]);
  const toastCol = findCol(sample, ["toastmaster", "is toastmaster", "toast master"]);
  const clubCol = findCol(sample, ["club", "club name", "member of"]);

  if (!regNoCol || !nameCol || !emailCol) {
    return res.status(400).json({
      success: false,
      error: `Missing required columns. Found: ${Object.keys(sample).join(", ")} — need at least "Register No", "Name", "Email"`,
    });
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; registerNo?: string; error: string }> = [];

  // create batch first
  const batch = await prisma.memberImportBatch.create({
    data: {
      fileName: originalName,
      rowCount: records.length,
      createdById: req.user!.id,
    },
  });

  // random password for placeholder users (isActive=false)
  const placeholderHash = await bcrypt.hash("TempPass123!" + Math.random().toString(36).slice(2), 12);

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // 1-indexed + header

    const rawReg = String(row[regNoCol] || "").trim();
    const regNo = normalizeRegisterNo(rawReg);
    if (!regNo) {
      skipped++;
      errors.push({ row: rowNum, registerNo: rawReg, error: "Invalid Register No format" });
      continue;
    }

    const rawName = String(row[nameCol] || "").trim();
    if (!rawName) {
      skipped++;
      errors.push({ row: rowNum, registerNo: regNo, error: "Missing Name" });
      continue;
    }

    const rawEmail = String(row[emailCol] || "").trim().toLowerCase();
    // basic email validation, but allow empty? require email for now
    if (!rawEmail || !rawEmail.includes("@")) {
      skipped++;
      errors.push({ row: rowNum, registerNo: regNo, error: "Invalid Email" });
      continue;
    }

    const programme = programmeCol ? String(row[programmeCol] || "").trim() : "";
    const school = schoolCol ? String(row[schoolCol] || "").trim() : "";
    const mobile = mobileCol ? String(row[mobileCol] || "").trim() : "";
    const club = clubCol ? String(row[clubCol] || "").trim() : "";
    const toastRaw = toastCol ? String(row[toastCol] || "").trim().toLowerCase() : "";
    const isToastmaster = ["yes", "y", "true", "1", "toastmaster"].includes(toastRaw);

    // programme/school can be empty but warn
    if (!school) {
      // not blocking, but keep as unknown
    }

    try {
      // Find existing user by registerNo, else email, else vitEmail
      let user = await prisma.user.findFirst({
        where: { OR: [{ registerNo: regNo }, { email: rawEmail }, { vitEmail: rawEmail }] },
      });

      if (!user) {
        // create placeholder user with username = regNo lower
        const username = regNo.toLowerCase();
        // check username collision
        const usernameExists = await prisma.user.findUnique({ where: { username } });
        if (usernameExists) {
          // try regNo + random
          const altUsername = (regNo + Math.floor(Math.random() * 1000)).toLowerCase();
          user = await prisma.user.create({
            data: {
              email: rawEmail,
              vitEmail: rawEmail,
              username: altUsername,
              displayName: rawName,
              passwordHash: placeholderHash,
              registerNo: regNo,
              programme: programme || null,
              school: school || null,
              mobile: mobile || null,
              isToastmaster,
              club: club || null,
              isActive: false,
            },
          });
        } else {
          user = await prisma.user.create({
            data: {
              email: rawEmail,
              vitEmail: rawEmail,
              username,
              displayName: rawName,
              passwordHash: placeholderHash,
              registerNo: regNo,
              programme: programme || null,
              school: school || null,
              mobile: mobile || null,
              isToastmaster,
              club: club || null,
              isActive: false,
            },
          });
        }
      } else {
        // update user fields
        await prisma.user.update({
          where: { id: user.id },
          data: {
            registerNo: regNo,
            vitEmail: rawEmail,
            programme: programme || user.programme,
            school: school || user.school,
            mobile: mobile || user.mobile,
            isToastmaster,
            club: club || user.club,
            displayName: rawName || user.displayName,
            // keep original email as login email if different? keep vitEmail separate
          },
        });
      }

      // Upsert MemberProfile by registerNo or userId
      const existingProfile = await prisma.memberProfile.findFirst({
        where: { OR: [{ registerNo: regNo }, { userId: user.id }] },
      });

      if (existingProfile) {
        await prisma.memberProfile.update({
          where: { id: existingProfile.id },
          data: {
            programme: programme || existingProfile.programme,
            name: rawName,
            school: school || existingProfile.school,
            email: rawEmail,
            mobile: mobile || existingProfile.mobile,
            isToastmaster,
            club: club || existingProfile.club,
            importBatchId: batch.id,
          },
        });
        updated++;
      } else {
        await prisma.memberProfile.create({
          data: {
            userId: user.id,
            programme: programme || "Unknown",
            registerNo: regNo,
            name: rawName,
            school: school || "Unknown",
            email: rawEmail,
            mobile: mobile || null,
            isToastmaster,
            club: club || null,
            importBatchId: batch.id,
          },
        });
        imported++;
      }
    } catch (e: any) {
      skipped++;
      // Prisma unique violation
      if (e.code === "P2002") {
        errors.push({ row: rowNum, registerNo: regNo, error: "Duplicate Register No / Email / Username in DB: " + e.meta?.target });
      } else {
        errors.push({ row: rowNum, registerNo: regNo, error: e.message || String(e) });
      }
    }
  }

  // update batch rowCount to actual processed
  // keep original rowCount

  return res.json({
    success: true,
    data: {
      batchId: batch.id,
      fileName: originalName,
      totalRows: records.length,
      imported,
      updated,
      skipped,
      errors: errors.slice(0, 50), // limit
      hasMoreErrors: errors.length > 50,
    },
  });
});

// GET /api/admin/members – searchable list
router.get("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  const search = (req.query.search ? String(req.query.search).trim() : "").toLowerCase();
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
  const school = req.query.school ? String(req.query.school).trim() : "";
  const club = req.query.club ? String(req.query.club).trim() : "";
  const toast = req.query.toastmaster ? String(req.query.toastmaster).trim().toLowerCase() : "";

  const where: any = {};
  const and: any[] = [];
  if (search) {
    and.push({
      OR: [
        { registerNo: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { user: { displayName: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (school) and.push({ school: { equals: school, mode: "insensitive" } });
  if (club) and.push({ club: { equals: club, mode: "insensitive" } });
  if (toast === "yes" || toast === "true") and.push({ isToastmaster: true });
  if (toast === "no" || toast === "false") and.push({ isToastmaster: false });
  if (and.length) where.AND = and;

  const [profiles, total] = await Promise.all([
    prisma.memberProfile.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { registerNo: "asc" },
      include: { user: { select: { id: true, username: true, displayName: true, email: true, totalPoints: true, isActive: true } } },
    }),
    prisma.memberProfile.count({ where }),
  ]);

  // also return distinct schools/clubs for filter dropdowns
  const schools = await prisma.memberProfile.findMany({ distinct: ["school"], select: { school: true } });
  const clubs = await prisma.memberProfile.findMany({ distinct: ["club"], select: { club: true }, where: { club: { not: null } } });

  return res.json({
    success: true,
    data: {
      profiles,
      total,
      limit,
      offset,
      schools: schools.map(s => s.school).filter(Boolean),
      clubs: clubs.map(c => c.club).filter(Boolean) as string[],
    },
  });
});

// GET /api/admin/members/batches – import history
router.get("/batches", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), async (_req, res) => {
  const batches = await prisma.memberImportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { createdBy: { select: { username: true, displayName: true } } },
  });
  res.json({ success: true, data: batches });
});

export default router;
