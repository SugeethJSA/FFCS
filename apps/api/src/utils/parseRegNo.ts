/**
 * RegNo parsing for VIT FFCS – handles Meet display names like "Jeethesh R 25BDS1237"
 * Pattern covers 25BCE1565, 25BDS1237, 25MIS1103, 25BLC1105, 26BLC1276 etc.
 */

export const REGNO_RE = /\b(\d{2}[A-Z]{2,5}\d{3,4})\b/;

/**
 * Extract last RegNo token from a raw Meet display name.
 * Upper-cases before matching, returns clean name without the RegNo.
 */
export function parseMeetName(raw: string): { cleanName: string; registerNo: string | null } {
  if (!raw || typeof raw !== "string") return { cleanName: "", registerNo: null };
  const trimmed = raw.trim();
  if (!trimmed) return { cleanName: "", registerNo: null };
  const upper = trimmed.toUpperCase();
  const m = upper.match(REGNO_RE);
  if (!m || !m[1]) return { cleanName: trimmed, registerNo: null };
  const reg = m[1];
  // remove last occurrence of reg (case-insensitive)
  const idx = upper.lastIndexOf(reg);
  const clean = (trimmed.slice(0, idx) + trimmed.slice(idx + reg.length)).trim().replace(/\s{2,}/g, " ");
  return { cleanName: clean || trimmed.replace(new RegExp(reg, "i"), "").trim(), registerNo: reg };
}

/**
 * Normalize a register no from master CSV — upper trim, validate.
 */
export function normalizeRegisterNo(input: string): string | null {
  if (!input) return null;
  const v = String(input).trim().toUpperCase();
  if (!REGNO_RE.test(v)) return null;
  // extract token if extra spaces/text
  const m = v.match(REGNO_RE);
  return m ? m[1] : null;
}

export function isValidRegisterNo(v: string): boolean {
  return REGNO_RE.test(String(v).trim().toUpperCase());
}
