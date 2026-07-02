import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getMyReservations, getReservation } from "../controllers/reservationController";

const router = Router();

router.get("/mine", authenticate, getMyReservations);
router.get("/:id", authenticate, getReservation);

export default router;
