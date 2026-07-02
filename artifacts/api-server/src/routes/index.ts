import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import stallsRouter from "./stalls";
import reservationsRouter from "./reservations";
import paymentsRouter from "./payments";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/stalls", stallsRouter);
router.use("/reservations", reservationsRouter);
router.use("/payments", paymentsRouter);
router.use("/admin", adminRouter);

export default router;
