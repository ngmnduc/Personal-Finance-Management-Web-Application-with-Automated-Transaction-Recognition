import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '../config/prisma';
import * as transactionRepository from '../repositories/transaction.repository';
import { TransactionType, TxSource } from '@prisma/client';
import { AppError } from '../utils/errors';
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
  const form = new FormData();
  form.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });
  form.append('scan_context', scanContext);

  let ocrData: any;

  try {
    const response = await axios.post(
      `${OCR_SERVICE_URL}/api/v1/ocr/scan`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 60000,
      },
    );
    ocrData = response.data;

  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || err?.response?.data?.message;

    // Python service rate limited after all fallbacks -> clear notification
    if (status === 429) {
      throw new AppError(
        429,
        'OCR_RATE_LIMITED',
        'OCR system is busy. Please try again in 60 seconds.',
      );
    }

    // Python service cold start or crash
    if (status === 502 || status === 503) {
      throw new AppError(
        503,
        'OCR_UNAVAILABLE',
        'OCR service is starting up. Please try again in 30 seconds.',
      );
    }

    // Python processed but extraction failed (blurry image, unrecognized)
    if (status === 422) {
      throw new AppError(
        422,
        'OCR_EXTRACTION_FAILED',
        detail || 'Could not recognize image content. Please provide a clearer photo.',
      );
    }

    // Timeout — Python is taking too long
    if (err.code === 'ECONNABORTED') {
      throw new AppError(
        504,
        'OCR_TIMEOUT',
        'OCR processing timed out. Please try again.',
      );
    }

    // Lỗi khác — re-throw để errorHandler bắt
    throw err;
  }

  // Resolve default wallet
  const defaultWallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true, archivedAt: null },
    select: { id: true },
  });

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
