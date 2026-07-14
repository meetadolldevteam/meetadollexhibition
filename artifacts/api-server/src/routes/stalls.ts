import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { getStalls, getStallStats, holdStall } from "../controllers/stallController";
import { validate } from "../middleware/validate";
import { stallHoldRateLimiter, suspiciousActivityLimiter } from "../middleware/rateLimit";

const router = Router();

router.get("/stats", getStallStats);

router.get("/", getStalls);

router.post(
  "/hold",
  authenticate,
  suspiciousActivityLimiter,
  stallHoldRateLimiter,
  [body("stall_id").trim().notEmpty().withMessage("Stall ID is required")],
  validate,
  holdStall
);

export default router;
