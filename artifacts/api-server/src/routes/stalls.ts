import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { getAvailableStalls, holdStall } from "../controllers/stallController";

const router = Router();

router.get("/", authenticate, getAvailableStalls);

router.post(
  "/hold",
  authenticate,
  [body("stall_id").notEmpty(), body("exhibition_id").notEmpty()],
  holdStall
);

export default router;
