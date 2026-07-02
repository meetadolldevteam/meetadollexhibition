import { Router } from "express";
import { body } from "express-validator";
import { register, login, verifyEmail } from "../controllers/authController";
import { validate } from "../middleware/validate";

const router = Router();

router.post(
  "/register",
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
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  login
);

router.post("/verify-email", [body("token").notEmpty()], validate, verifyEmail);

export default router;
