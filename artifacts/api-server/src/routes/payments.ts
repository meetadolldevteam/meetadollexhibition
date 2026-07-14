import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { initiatePayment, paymentWebhook } from "../controllers/paymentController";
import { validate } from "../middleware/validate";
import { suspiciousActivityLimiter } from "../middleware/rateLimit";

const router = Router();

router.post(
  "/initiate",
  authenticate,
  suspiciousActivityLimiter,
  [body("reservation_id").trim().notEmpty().withMessage("Reservation ID is required")],
  validate,
  initiatePayment
);

router.post("/webhook", paymentWebhook);

export default router;
