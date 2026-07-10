import { Request, Response } from "express";
import { logger } from "../lib/logger";
import { AuthRequest } from "../middleware/auth";

export async function initiatePayment(req: AuthRequest, res: Response): Promise<void> {
  logger.info({ reservation_id: req.body?.reservation_id }, "Payment initiation requested (placeholder)");
  res.status(503).json({
    error: "Payment is not yet active. Please contact us directly to complete your reservation.",
  });
}

export async function paymentWebhook(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: "Webhook endpoint placeholder — payment gateway not yet configured." });
}
