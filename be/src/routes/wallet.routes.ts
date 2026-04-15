import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware"; // Dùng đúng tên middleware auth của bạn
import { walletController } from "../controllers/wallet.controller";

const router = Router();

router.use(requireAuth);

router.get("/", walletController.getWallets);
router.post("/", walletController.createWallet);
router.patch("/:id", walletController.updateWallet);
router.delete("/:id", walletController.deleteWallet);
router.post("/:id/set-default", walletController.setDefaultWallet);

export default router;