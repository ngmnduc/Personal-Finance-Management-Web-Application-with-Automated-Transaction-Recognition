import { Request, Response, NextFunction } from "express";
import { walletService } from "../services/wallet.service";
import { sendSuccess } from "../utils/response";

export const walletController = {
  getWallets: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const wallets = await walletService.getWallets(userId);
      sendSuccess(res, wallets, "Get wallets successfully", 200);
    } catch (error) {
      next(error);
    }
  },

  createWallet: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { name, type, initialBalance } = req.body;
      const wallet = await walletService.createWallet(userId, { name, type, initialBalance });
      sendSuccess(res, wallet, "Wallet created successfully", 201);
    } catch (error) {
      next(error);
    }
  },

  updateWallet: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as {id:string};
      const { name, type, initialBalance } = req.body;
      const wallet = await walletService.updateWallet(id, userId, { name, type, initialBalance });
      sendSuccess(res, wallet, "Wallet updated successfully", 200);
    } catch (error) {
      next(error);
    }
  },

  deleteWallet: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as {id:string};
      
      const result = await walletService.deleteWallet(id, userId);
      const message = result.action === 'archived' 
        ? "Wallet archived successfully" 
        : "Wallet deleted successfully";

      sendSuccess(res, null, message, 200);
    } catch (error) {
      next(error);
    }
  },

  setDefaultWallet: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as {id:string};
      const wallet = await walletService.setDefaultWallet(userId, id);
      sendSuccess(res, wallet, "Default wallet set successfully", 200);
    } catch (error) {
      next(error);
    }
  },
};