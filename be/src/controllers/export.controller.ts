import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { getTransactions, generateCSV, ExportFilters } from '../services/export.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse filter params shared by both CSV and PDF endpoints.
 * Supports:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD  (explicit range)
 *   ?month=YYYY-MM                   (convenience — auto-expands to full month)
 */
function parseFilters(query: Request['query']): ExportFilters {
  const { from, to, month, walletId, categoryId } = query as Record<string, string | undefined>;

  const filters: ExportFilters = {};

  if (month) {
    const [yearStr, monthStr] = month.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1; // 0-indexed
    filters.from = new Date(y, m, 1, 0, 0, 0, 0);
    filters.to   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  } else {
    if (from) filters.from = new Date(from);
    if (to)   filters.to   = new Date(to);
  }

  if (walletId)   filters.walletId   = walletId;
  if (categoryId) filters.categoryId = categoryId;

  return filters;
}

// ─── exportCSV ────────────────────────────────────────────────────────────────

export const exportCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId  = req.user!.userId;
    const filters = parseFilters(req.query);

    const transactions = await getTransactions(userId, filters);
    const csvContent   = generateCSV(transactions);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename  = `transactions-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

// ─── exportPDF ────────────────────────────────────────────────────────────────

export const exportPDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId  = req.user!.userId;
    const filters = parseFilters(req.query);

    const transactions = await getTransactions(userId, filters);

    // Serialize for Python service — no BigInt in JSON
    const payload = transactions.map((t) => ({
      id:              t.id,
      amount:          Number(t.amount),
      type:            t.type,
      transactionDate: new Date(t.transactionDate).toISOString(),
      category:        t.category?.name ?? '',
      wallet:          t.wallet?.name   ?? '',
      merchant:        t.merchant       ?? '',
      note:            t.note           ?? '',
      source:          t.source         ?? '',
    }));

    const ocrServiceUrl = process.env.OCR_SERVICE_URL ?? 'http://localhost:8001';
    const pdfResponse   = await axios.post(
      `${ocrServiceUrl}/api/v1/export/pdf`,
      { transactions: payload },
      { responseType: 'arraybuffer', timeout: 30_000 },
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename  = `transactions-${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfResponse.data.byteLength);
    res.send(Buffer.from(pdfResponse.data));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      next(AppError.Internal('PDF generation service unavailable. Please try again later.'));
    } else {
      next(error);
    }
  }
};
