import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Fix SQLite file: URL for local dev without Docker
// Prisma resolves `file:./dev.db` relative to schema file (prisma/dev.db) at generate time,
// but at runtime `file:./dev.db` would be relative to cwd (FFCS-backend/dev.db).
// We normalize to absolute path pointing to prisma/dev.db so both work.
function getDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  if (raw.startsWith("file:")) {
    const filePart = raw.slice(5);
    // Already absolute? keep
    if (path.isAbsolute(filePart)) return raw;
    // Normalize ./dev.db , ./prisma/dev.db , prisma/dev.db all to prisma/dev.db absolute
    // If env is file:./dev.db and we want file at prisma/dev.db, map it
    let normalized = filePart;
    // Strip leading ./ or .\
    if (normalized.startsWith("./")) normalized = normalized.slice(2);
    if (normalized.startsWith(".\\")) normalized = normalized.slice(2);
    // If it's just dev.db or dev.db with no dir, put in prisma/
    if (normalized === "dev.db" || normalized === "prisma/dev.db" || normalized === "prisma\\dev.db") {
      const abs = path.resolve(process.cwd(), "prisma", "dev.db");
      // Ensure dir exists
      try { fs.mkdirSync(path.dirname(abs), { recursive: true }); } catch {}
      return `file:${abs}`;
    }
    // For any other relative file: path, resolve relative to cwd
    const abs = path.resolve(process.cwd(), normalized);
    try { fs.mkdirSync(path.dirname(abs), { recursive: true }); } catch {}
    return `file:${abs}`;
  }
  return raw;
}

const dbUrl = getDatabaseUrl();
if (dbUrl && dbUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = dbUrl;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
