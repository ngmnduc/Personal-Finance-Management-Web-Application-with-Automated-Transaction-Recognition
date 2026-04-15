import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { categoryController } from "../controllers/category.controller";

const router = Router();

router.use(requireAuth);

router.get("/", categoryController.getCategories);
router.post("/", categoryController.createCategory);
router.patch("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

export default router;