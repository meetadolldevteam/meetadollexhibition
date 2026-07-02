import { Router } from "express";
import { body } from "express-validator";
import { register, login, verifyEmail } from "../controllers/authController";

const router = Router();

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("name").notEmpty(),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  login
);

router.post("/verify-email", [body("token").notEmpty()], verifyEmail);

export default router;
