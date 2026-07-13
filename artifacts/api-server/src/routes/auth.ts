import { Router } from "express";
import { body } from "express-validator";
import { register, login, verifyEmail, refresh, logout } from "../controllers/authController";
import { verifyOtp, resendOtp, sendOtpEndpoint } from "../controllers/otpController";
import { validate } from "../middleware/validate";
import {
  loginRateLimiter,
  registerRateLimiter,
  otpVerifyRateLimiter,
  otpResendRateLimiter,
} from "../middleware/rateLimit";

const router = Router();

router.post(
  "/register",
  registerRateLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("name").notEmpty(),
  ],
  validate,
  register
);

router.post(
  "/login",
  loginRateLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  login
);

router.post(
  "/verify-otp",
  otpVerifyRateLimiter,
  [
    body("userId").notEmpty(),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric(),
    body("type").isIn(["registration", "login"]),
  ],
  validate,
  verifyOtp
);

router.post(
  "/resend-otp",
  otpResendRateLimiter,
  [
    body("userId").notEmpty(),
    body("type").isIn(["registration", "login"]),
  ],
  validate,
  resendOtp
);

router.post(
  "/send-otp",
  otpResendRateLimiter,
  [
    body("userId").notEmpty(),
    body("type").isIn(["registration", "login"]),
  ],
  validate,
  sendOtpEndpoint
);

router.post("/verify-email", [body("token").notEmpty()], validate, verifyEmail);

router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
