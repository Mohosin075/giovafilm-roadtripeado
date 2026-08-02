import express from 'express'
import passport from 'passport'
import { PassportAuthController } from './passport.auth/passport.auth.controller'
import { CustomAuthController } from './custom.auth/custom.auth.controller'
import validateRequest from '../../middleware/validateRequest'
import { AuthValidations } from './auth.validation'
import { USER_ROLES } from '../../enum/user'
import auth from '../../middleware/auth'
import {
  authRateLimiter,
  otpRateLimiter,
  passwordRateLimiter,
  refreshTokenRateLimiter,
} from '../../middleware/rateLimit'

const router = express.Router()

router.post(
  '/signup',
  authRateLimiter,
  validateRequest(AuthValidations.createUserZodSchema),
  CustomAuthController.createUser,
)
router.post(
  '/admin-login',
  authRateLimiter,
  validateRequest(AuthValidations.loginZodSchema),
  CustomAuthController.adminLogin,
)
router.post(
  '/login',
  authRateLimiter,
  validateRequest(AuthValidations.loginZodSchema),
  passport.authenticate('local', { session: false }),
  PassportAuthController.login,
)

router.get(
  '/google',
  authRateLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'] }),
)

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  PassportAuthController.googleAuthCallback,
)

router.post(
  '/verify-account',
  otpRateLimiter,
  validateRequest(AuthValidations.verifyAccountZodSchema),
  CustomAuthController.verifyAccount,
)

router.post(
  '/custom-login',
  authRateLimiter,
  validateRequest(AuthValidations.loginZodSchema),
  CustomAuthController.customLogin,
)

router.post(
  '/forget-password',
  otpRateLimiter,
  validateRequest(AuthValidations.forgetPasswordZodSchema),
  CustomAuthController.forgetPassword,
)
router.post(
  '/reset-password',
  passwordRateLimiter,
  validateRequest(AuthValidations.resetPasswordZodSchema),
  CustomAuthController.resetPassword,
)

router.post(
  '/resend-otp',
  otpRateLimiter,
  validateRequest(AuthValidations.resendOtpZodSchema),
  CustomAuthController.resendOtp,
)

router.post(
  '/change-password',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.MAP_EDITOR),
  passwordRateLimiter,
  validateRequest(AuthValidations.changePasswordZodSchema),
  CustomAuthController.changePassword,
)

router.delete(
  '/delete-account',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.MAP_EDITOR),
  validateRequest(AuthValidations.deleteAccount),
  CustomAuthController.deleteAccount,
)
router.post(
  '/refresh-token',
  refreshTokenRateLimiter,
  CustomAuthController.getRefreshToken,
)

router.post(
  '/social-login',
  authRateLimiter,
  validateRequest(AuthValidations.socialLoginZodSchema),
  CustomAuthController.socialLogin,
)

router.post(
  '/logout',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.MAP_EDITOR),
  CustomAuthController.logout,
)

export const AuthRoutes = router
