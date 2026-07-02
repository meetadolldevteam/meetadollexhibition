import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/roleCheck";
import {
  getAllReservations,
  updateStall,
  cancelReservation,
  announceToVendors,
} from "../controllers/adminController";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/reservations", getAllReservations);
router.patch("/stalls/:id", [body("status").notEmpty()], updateStall);
router.delete("/reservations/:id", cancelReservation);
router.post(
  "/announce",
  [body("subject").notEmpty(), body("message").notEmpty()],
  announceToVendors
);

export default router;
