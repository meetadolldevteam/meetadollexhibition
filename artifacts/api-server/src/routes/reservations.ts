import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getMyReservations, getReservation, cancelMyReservation } from "../controllers/reservationController";

const router = Router();

router.get("/mine", authenticate, getMyReservations);
router.get("/:id", authenticate, getReservation);
router.delete("/:id", authenticate, cancelMyReservation);

export default router;
