import { Router } from "express";
import { body } from "express-validator";
import { register, login, verifyEmail, refresh, logout } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { loginRateLimiter, registerRateLimiter } from "../middleware/rateLimit";

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

router.post("/verify-email", [body("token").notEmpty()], validate, verifyEmail);

router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
