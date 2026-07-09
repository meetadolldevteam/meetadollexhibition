import { Router } from "express";
import { getExhibitions } from "../controllers/exhibitionController";

const router = Router();

router.get("/", getExhibitions);

export default router;
