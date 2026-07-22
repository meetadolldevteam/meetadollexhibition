import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import multer from "multer";
import { register, login, verifyEmail, refresh, logout, completeBusinessProfile } from "../controllers/authController";
import { verifyOtp, resendOtp, sendOtpEndpoint } from "../controllers/otpController";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import {
  loginRateLimiter,
  registerRateLimiter,
  otpVerifyRateLimiter,
  otpResendRateLimiter,
} from "../middleware/rateLimit";

const router = Router();

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ACCEPTED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Logo must be a JPG, PNG, or WebP image."));
    }
  },
});

function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("business_logo")(req, res, (err: unknown) => {
    if (!err) { next(); return; }
    if (err instanceof multer.MulterError) {
      const msg = err.code === "LIMIT_FILE_SIZE"
        ? "Logo must be under 4MB."
        : err.message;
      res.status(422).json({ error: msg });
      return;
    }
    const message = err instanceof Error ? err.message : "File upload failed.";
    res.status(422).json({ error: message });
  });
}

// ── Registration (personal details only) ─────────────────────────────────────
router.post(
  "/register",
  registerRateLimiter,
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
      .matches(/^[\p{L}\s'.\-]+$/u)
      .withMessage("Name must contain letters only"),
    body("phone")
      .optional({ nullable: true, checkFalsy: true })
      .customSanitizer((val: string) =>
        typeof val === "string" ? val.replace(/[\s\-().+]/g, "").replace(/^234/, "0") : val
      )
      .matches(/^0[789]\d{9}$/)
      .withMessage("Must be a valid Nigerian phone number (e.g. 08012345678)"),
    body("vendor_category")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isIn(["fashion", "food", "others", "Fashion", "Food", "Others"])
      .withMessage("Vendor category must be Fashion, Food, or Others"),
  ],
  validate,
  register
);

// ── Business profile completion (after login, before stall pick) ──────────────
router.post(
  "/business-profile",
  authenticate,
  handleUpload,
  [
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
      .customSanitizer((val: string) => val.replace(/[\s\-().]/g, ""))
      .matches(/^(\+?234|0)[789]\d{9}$/)
      .withMessage("Must be a valid Nigerian phone number (e.g. 08012345678)"),
    body("instagram_username")
      .trim()
      .notEmpty()
      .withMessage("Instagram username is required")
      .customSanitizer((val: string) => {
        if (typeof val !== "string") return val;
        return val
          .replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "")
          .replace(/^instagram\.com\/?/, "")
          .replace(/\/$/, "")
          .replace(/^@+/, "")
          .trim();
      })
      .matches(/^[a-zA-Z0-9._]{1,30}$/)
      .withMessage("Enter a valid Instagram username (e.g. amiras_closet)"),
  ],
  validate,
  completeBusinessProfile
);

// ── Auth flows ────────────────────────────────────────────────────────────────
router.post(
  "/login",
  loginRateLimiter,
  [
    body("email").trim().isEmail().withMessage("Must be a valid email address").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
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
    body("type").isIn(["registration", "login"]).withMessage("Invalid OTP type"),
  ],
  validate,
  verifyOtp
);

router.post(
  "/resend-otp",
  otpResendRateLimiter,
  [
    body("userId").trim().notEmpty().withMessage("User ID is required"),
    body("type").isIn(["registration", "login"]).withMessage("Invalid OTP type"),
  ],
  validate,
  resendOtp
);

router.post(
  "/send-otp",
  otpResendRateLimiter,
  [
    body("userId").trim().notEmpty().withMessage("User ID is required"),
    body("type").isIn(["registration", "login"]).withMessage("Invalid OTP type"),
  ],
  validate,
  sendOtpEndpoint
);

router.post("/verify-email", [body("token").trim().notEmpty()], validate, verifyEmail);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
