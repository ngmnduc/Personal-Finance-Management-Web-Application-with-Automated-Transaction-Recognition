import { AppError } from "../utils/errors";
import { walletRepository } from "../repositories/wallet.repository";
import { categoryRepository } from "../repositories/category.repository";
import { WalletType, TxSource } from "@prisma/client";
import { prisma } from "../config/prisma";

export const walletService = {
  getWallets: async (userId: string, includeArchived: boolean = false) => {
    return walletRepository.findManyByUserId(userId, includeArchived);
  },

  createWallet: async (userId: string, data: { name: string; type: string; initialBalance: number }) => {
    const count = await walletRepository.countByUserId(userId);
    
    // Nếu là ví đầu tiên của user, tự động set làm default
    const isDefault = count === 0;
    const formattedType = data.type.toUpperCase().replace('-', '_');

    return walletRepository.create({
      userId,
      name: data.name,
      type: formattedType, 
      initialBalance: BigInt(data.initialBalance),
      isDefault,
    });
  },

  updateWallet: async (id: string, userId: string, data: { name?: string; type?: string; initialBalance?: number; currentBalance?: number }) => {
    const existingWallet = await walletRepository.findActiveByIdAndUserId(id, userId);
    if (!existingWallet) {
      throw AppError.NotFound("Wallet not found");
    }

    /* Track historical transaction metrics for split-logic adjustments */
    const txCount = await prisma.transaction.count({ where: { walletId: id, deletedAt: null } });
    const updateData: any = { name: data.name };
    if (data.type) {
      const formattedType = data.type.toUpperCase().replace('-', '_');
      updateData.type = formattedType;
    }

    if (txCount === 0) {
      /* Typo Mode (Nhánh A): Directly overwrite both balances if no history exists */
      const newBalanceVal = data.currentBalance !== undefined ? data.currentBalance : data.initialBalance;
      if (newBalanceVal !== undefined) {
        updateData.initialBalance = BigInt(newBalanceVal);
        updateData.currentBalance = BigInt(newBalanceVal);
      }
      return walletRepository.update(id, updateData);
    } else {
      /* Adjustment Mode (Nhánh B): System transaction generated for variance deltas */
      if (data.currentBalance !== undefined) {
        const newCurrentBalance = BigInt(data.currentBalance);
        const diff = newCurrentBalance - existingWallet.currentBalance;

        if (diff !== 0n) {
          const adjType = diff > 0n ? "INCOME" : "EXPENSE";
          const absDiff = diff > 0n ? diff : -diff;

          const sysCategory = await categoryRepository.findSystemByNameAndType("Balance Adjustment", adjType);
          if (!sysCategory) throw AppError.Internal("System adjustment category missing");

          /* Execute adjustment mutation inside atomic transaction */
          await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId,
                walletId: id,
                categoryId: sysCategory.id,
                amount: absDiff,
                type: adjType as any,
                source: TxSource.MANUAL,
                note: "System automatic balance adjustment",
                transactionDate: new Date(),
              }
            });

            const walletUpdateFields: any = { currentBalance: newCurrentBalance };
            if (data.name) walletUpdateFields.name = data.name;
            if (data.type) {
              const formattedType = data.type.toUpperCase().replace('-', '_');
              walletUpdateFields.type = formattedType;
            }

            await tx.wallet.update({
              where: { id },
              data: walletUpdateFields,
            });
          });

          return walletRepository.findActiveByIdAndUserId(id, userId);
        }
      }

      /* Fallback update for metadata changes without balance mutations */
      return walletRepository.update(id, updateData);
    }
  },

  deleteWallet: async (id: string, userId: string) => {
    const existingWallet = await walletRepository.findActiveByIdAndUserId(id, userId);
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

  restoreWallet: async (id: string, userId: string) => {
    const existingWallet = await walletRepository.findByIdAndUserId(id, userId);
    if (!existingWallet) {
      throw AppError.NotFound("Wallet not found");
    }
    return walletRepository.restore(id);
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