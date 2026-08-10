import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import {
  initiatePayment,
  initiateDirectPayment,
  paymentWebhook,
  paymentCallback,
} from "../controllers/paymentController";
import { validate } from "../middleware/validate";
import { suspiciousActivityLimiter } from "../middleware/rateLimit";

const router = Router();

// New direct route: reserve stall + initiate payment in one step (no separate hold screen)
router.post(
  "/initiate-direct",
  authenticate,
  suspiciousActivityLimiter,
  [body("stall_id").trim().notEmpty().withMessage("Stall ID is required")],
  validate,
  initiateDirectPayment
);

// Legacy route: pay for an already-held reservation (kept for My Reservations page)
router.post(
  "/initiate",
  authenticate,
  suspiciousActivityLimiter,
  [body("reservation_id").trim().notEmpty().withMessage("Reservation ID is required")],
  validate,
  initiatePayment
);

// Configure this URL in Paystack: https://meetadollexhibition-api.onrender.com/api/payments/webhook
router.post("/webhook", paymentWebhook);
router.get("/callback", paymentCallback);

export default router;
