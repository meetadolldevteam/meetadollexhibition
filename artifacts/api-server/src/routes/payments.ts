import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { initiatePayment, paymentWebhook } from "../controllers/paymentController";
import { validate } from "../middleware/validate";

const router = Router();

router.post(
  "/initiate",
  authenticate,
  [body("reservation_id").notEmpty()],
  validate,
  initiatePayment
);

router.post("/webhook", paymentWebhook);

export default router;
