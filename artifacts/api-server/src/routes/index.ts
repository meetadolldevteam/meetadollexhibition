import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import devAuthRouter from "./devAuth";
import stallsRouter from "./stalls";
import reservationsRouter from "./reservations";
import paymentsRouter from "./payments";
import adminRouter from "./admin";
import exhibitionsRouter from "./exhibitions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/auth", devAuthRouter);
router.use("/exhibitions", exhibitionsRouter);
router.use("/stalls", stallsRouter);
router.use("/reservations", reservationsRouter);
router.use("/payments", paymentsRouter);
router.use("/admin", adminRouter);

export default router;
