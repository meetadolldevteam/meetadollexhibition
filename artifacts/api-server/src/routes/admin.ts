import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/roleCheck";
import { validate } from "../middleware/validate";
import {
  getAllReservations,
  getPaymentsSummary,
  updateStall,
  cancelReservation,
  announceToVendors,
} from "../controllers/adminController";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/reservations", getAllReservations);
router.get("/payments/summary", getPaymentsSummary);
router.patch("/stalls/:id", [body("status").notEmpty()], validate, updateStall);
router.delete("/reservations/:id", cancelReservation);
router.post(
  "/announce",
  [body("subject").notEmpty(), body("message").notEmpty()],
  validate,
  announceToVendors
);

export default router;
