import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '../config/prisma';
import * as transactionRepository from '../repositories/transaction.repository';
import { TransactionType, TxSource } from '@prisma/client';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? 'http://localhost:8001';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmOCRInput {
  amount: number;
  transactionDate: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string;
  walletId: string;
  extractedText?: string;
  merchant?: string;
  note?: string;
}

// ── scan ──────────────────────────────────────────────────────────────────────

export const scan = async (
  file: Express.Multer.File,
  scanContext: string,
  userId: string,
) => {
  // Build multipart form-data for the Python OCR service
  const form = new FormData();
  form.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });
  form.append('scan_context', scanContext);

  const { data: ocrData } = await axios.post(
    `${OCR_SERVICE_URL}/api/v1/ocr/scan`,
    form,
    { headers: form.getHeaders() },
  );

  // Resolve the user's default wallet so the FE can pre-fill the wallet picker
  const defaultWallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true, archivedAt: null },
    select: { id: true },
  });

  // Inject wallet + category hints into the OCR response
  return {
    ...ocrData,
    default_wallet_id: defaultWallet?.id ?? null,
    suggested_category_id: null,
  };
};

// ── confirm ───────────────────────────────────────────────────────────────────

export const confirm = async (data: ConfirmOCRInput, userId: string) => {
  // Reuse the existing repository (includes atomic wallet balance update)
  const transaction = await transactionRepository.create({
    userId,
    walletId: data.walletId,
    categoryId: data.categoryId,
    type: data.type as TransactionType,
    amount: BigInt(data.amount),
    transactionDate: new Date(data.transactionDate),
    merchant: data.merchant,
    note: data.note,
    source: TxSource.OCR,
    extractedText: data.extractedText,
  });

  // Fetch the updated wallet balance to surface in the response
  const wallet = await prisma.wallet.findUnique({
    where: { id: data.walletId },
    select: { currentBalance: true },
  });

  return {
    transaction,
    wallet: { currentBalance: wallet?.currentBalance ?? null },
    budget_alert: { triggered: false },
  };
};

// ── getBanks ──────────────────────────────────────────────────────────────────

const BANK_FALLBACK = [
  { id: 'vcb',  name: 'Vietcombank' },
  { id: 'mb',   name: 'MB Bank' },
  { id: 'tcb',  name: 'Techcombank' },
  { id: 'bidv', name: 'BIDV' },
  { id: 'momo', name: 'MoMo' },
];

export const getBanks = async () => {
  try {
    const { data } = await axios.get(`${OCR_SERVICE_URL}/api/v1/ocr/banks`);
    return data;
  } catch {
    return BANK_FALLBACK;
  }
};
