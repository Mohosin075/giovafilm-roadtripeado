import rateLimit from 'express-rate-limit'
import { StatusCodes } from 'http-status-codes'

const rateLimitHandler = (_req: any, res: any) => {
  res.status(StatusCodes.TOO_MANY_REQUESTS).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  })
}

/** Login / signup / social login — brute-force protection */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

/** OTP verify / resend / forget-password — tighter spam protection */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

/** Password reset / change — account takeover protection */
export const passwordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

/** Public contact form */
export const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

/** Refresh token endpoint */
export const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})
