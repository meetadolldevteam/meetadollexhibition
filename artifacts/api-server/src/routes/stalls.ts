import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { getAvailableStalls, holdStall } from "../controllers/stallController";
import { validate } from "../middleware/validate";

const router = Router();

router.get("/", authenticate, getAvailableStalls);

router.post(
  "/hold",
  authenticate,
  [body("stall_id").notEmpty(), body("exhibition_id").notEmpty()],
  validate,
  holdStall
);

export default router;
