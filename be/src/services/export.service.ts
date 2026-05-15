import { getTransactionsForExport, ExportFilters } from '../repositories/export.repository';

// ─── Re-export type for controller use ────────────────────────────────────────

export type { ExportFilters };

// ─── Infer transaction row type from Prisma include ──────────────────────────

type TransactionRow = Awaited<ReturnType<typeof getTransactionsForExport>>[number];

// ─── getTransactions ──────────────────────────────────────────────────────────

export const getTransactions = (userId: string, filters: ExportFilters) =>
  getTransactionsForExport(userId, filters);

// ─── generateCSV ─────────────────────────────────────────────────────────────

const CSV_HEADER = '"Ngày","Loại","Số tiền","Danh mục","Ví","Người bán","Ghi chú","Nguồn"';

function escapeCSVField(value: string | null | undefined): string {
  const str = (value ?? '').replace(/"/g, '""'); // escape double-quotes
  return `"${str}"`;
}

export const generateCSV = (transactions: TransactionRow[]): string => {
  const rows = transactions.map((t) => {
    const date     = new Date(t.transactionDate).toLocaleDateString('vi-VN');
    const type     = t.type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu';
    const amount   = Number(t.amount);
    const category = t.category?.name ?? '';
    const wallet   = t.wallet?.name   ?? '';
    const merchant = t.merchant       ?? '';
    const note     = t.note           ?? '';
    const source   = t.source         ?? '';

    return [
      escapeCSVField(date),
      escapeCSVField(type),
      `"${amount}"`,               // numeric — still quoted for safety
      escapeCSVField(category),
      escapeCSVField(wallet),
      escapeCSVField(merchant),
      escapeCSVField(note),
      escapeCSVField(source),
    ].join(',');
  });

  // \uFEFF = UTF-8 BOM — required so Excel auto-detects UTF-8 encoding
  return '\uFEFF' + [CSV_HEADER, ...rows].join('\n');
};
