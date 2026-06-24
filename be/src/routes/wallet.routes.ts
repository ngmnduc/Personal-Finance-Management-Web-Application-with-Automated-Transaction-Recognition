import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware"; 
import { walletController } from "../controllers/wallet.controller";
import { z } from "zod";
import { validateRequest } from "../middlewares/validate.middleware";

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    type: z.enum(['cash', 'bank', 'e-wallet', 'general']),
    initialBalance: z.number().min(0),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    type: z.enum(['cash', 'bank', 'e-wallet', 'general']).optional(),
    initialBalance: z.number().min(0).optional(),
    currentBalance: z.number().min(0).optional(),
  }),
});

const router = Router();

router.use(requireAuth);

router.get("/", walletController.getWallets);
router.post("/", validateRequest(createSchema), walletController.createWallet);
router.patch("/:id", validateRequest(updateSchema), walletController.updateWallet);
router.delete("/:id", walletController.deleteWallet);
router.post("/:id/set-default", walletController.setDefaultWallet);
router.post("/:id/restore", walletController.restoreWallet);

export default router;