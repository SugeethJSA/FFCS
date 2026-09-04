import rateLimit from "express-rate-limit";

/**
 * General API limiter – 100 req / 15 min per IP (tune via env)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GENERAL || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please slow down." },
});

/**
 * Strict limiter for auth endpoints – 10 req / 15 min to mitigate brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH || "10", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: false,
});

/**
 * Award limiter – 30 awards / hour per admin IP
 */
export const awardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AWARD || "30", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Award rate limit exceeded. Try later." },
});
