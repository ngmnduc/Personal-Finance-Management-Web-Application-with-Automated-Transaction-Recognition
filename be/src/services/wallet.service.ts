import { AppError } from "../utils/errors";
import { walletRepository } from "../repositories/wallet.repository";
import { WalletType } from "@prisma/client";

export const walletService = {
  getWallets: async (userId: string) => {
    return walletRepository.findManyByUserId(userId);
  },

  createWallet: async (userId: string, data: { name: string; type: string; initialBalance: number }) => {
    const count = await walletRepository.countByUserId(userId);
    
    // Nếu là ví đầu tiên của user, tự động set làm default
    const isDefault = count === 0;

    return walletRepository.create({
      userId,
      name: data.name,
      type: data.type as WalletType,
      initialBalance: BigInt(data.initialBalance),
      isDefault,
    });
  },

  updateWallet: async (id: string, userId: string, data: { name?: string; type?: string; initialBalance?: number }) => {
    const existingWallet = await walletRepository.findByIdAndUserId(id, userId);
    if (!existingWallet) {
      throw AppError.NotFound("Wallet not found");
    }

    const updateData: any = { ...data };

    // Nếu thay đổi initialBalance, phải tính lại currentBalance
    if (data.initialBalance !== undefined) {
      // Ép  number từ req.body sang BigInt
      const newInitial = BigInt(data.initialBalance); 
      
      if (newInitial !== existingWallet.initialBalance) {
        const diff = newInitial - existingWallet.initialBalance;
        updateData.currentBalance = existingWallet.currentBalance + diff;
        updateData.initialBalance = newInitial; // Ghi đè lại bằng BigInt
      }
    }

    return walletRepository.update(id, updateData);
  },

  deleteWallet: async (id: string, userId: string) => {
    const existingWallet = await walletRepository.findByIdAndUserId(id, userId);
    if (!existingWallet) {
      throw AppError.NotFound("Wallet not found");
    }

    if (existingWallet.currentBalance > 0n) {
      await walletRepository.archive(id);
      return { action: 'archived' };
    } else {
      await walletRepository.softDelete(id);
      return { action: 'deleted' };
    }
  },

  setDefaultWallet: async (userId: string, newDefaultWalletId: string) => {
    // Xác minh ví tồn tại và thuộc về user
    const wallet = await walletRepository.findByIdAndUserId(newDefaultWalletId, userId);
    if (!wallet) {
      throw AppError.NotFound("Wallet not found");
    }

    return walletRepository.setDefaultTransaction(userId, newDefaultWalletId);
  },
};