import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { dashboardController } from "../controllers/dashboard.controller";

const router = Router();
router.use(requireAuth);

router.get("/overview", dashboardController.getOverview);

export default router;