// Optional: validate required env at boot (call in index.ts if desired)
export function assertEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"] as const;
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")} – see .env.example`);
  if ((process.env.JWT_SECRET?.length || 0) < 32) throw new Error("JWT_SECRET must be >= 32 chars");
}
