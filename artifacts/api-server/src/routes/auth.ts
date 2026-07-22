import { Router } from "express";
import { body } from "express-validator";
import multer from "multer";
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG files are allowed"));
    }
  },
});

router.post(
  "/register",
  registerRateLimiter,
  upload.single("business_logo"),
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),

    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/\d/)
      .withMessage("Password must contain at least one number"),

    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters")
      .matches(/^[a-zA-ZÀ-ÿ\s'.\\-]+$/)
      .withMessage("Name must contain letters only"),

    body("phone")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .matches(/^(\+?234|0)[789]\d{9}$/)
      .withMessage("Must be a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)"),

    body("vendor_category")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isIn(["fashion", "food", "others", "Fashion", "Food", "Others"])
      .withMessage("Vendor category must be Fashion, Food, or Others"),

    body("business_name")
      .trim()
      .notEmpty()
      .withMessage("Business name is required")
      .isLength({ min: 1, max: 200 })
      .withMessage("Business name must be under 200 characters"),

    body("business_category")
      .trim()
      .notEmpty()
      .withMessage("Business category is required")
      .isIn(["Fashion", "Food", "Beauty", "Accessories", "Art & Craft", "Others"])
      .withMessage("Invalid business category"),

    body("business_phone")
      .trim()
      .notEmpty()
      .withMessage("Business phone number is required")
      .matches(/^(\+?234|0)[789]\d{9}$/)
      .withMessage("Must be a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)"),

    body("instagram_username")
      .trim()
      .notEmpty()
      .withMessage("Instagram username is required")
      .matches(/^@?[a-zA-Z0-9._]{1,30}$/)
      .withMessage("Enter a valid Instagram username (letters, numbers, . and _ only)"),
  ],
  validate,
  register
);

router.post(
  "/login",
  loginRateLimiter,
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage("Password is required"),
  ],
  validate,
  login
);

router.post(
  "/verify-otp",
  otpVerifyRateLimiter,
  [
    body("userId").trim().notEmpty().withMessage("User ID is required"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be exactly 6 digits")
      .isNumeric()
      .withMessage("OTP must be numeric"),
    body("type")
      .isIn(["registration", "login"])
      .withMessage("Invalid OTP type"),
  ],
  validate,
  verifyOtp
);

router.post(
  "/resend-otp",
  otpResendRateLimiter,
  [
    body("userId").trim().notEmpty().withMessage("User ID is required"),
    body("type")
      .isIn(["registration", "login"])
      .withMessage("Invalid OTP type"),
  ],
  validate,
  resendOtp
);

router.post(
  "/send-otp",
  otpResendRateLimiter,
  [
    body("userId").trim().notEmpty().withMessage("User ID is required"),
    body("type")
      .isIn(["registration", "login"])
      .withMessage("Invalid OTP type"),
  ],
  validate,
  sendOtpEndpoint
);

router.post("/verify-email", [body("token").trim().notEmpty()], validate, verifyEmail);

router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
