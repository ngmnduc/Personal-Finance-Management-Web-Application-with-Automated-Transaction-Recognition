import { getTransactionsForExport, ExportFilters } from '../repositories/export.repository';

export type { ExportFilters };

type TransactionRow = Awaited<ReturnType<typeof getTransactionsForExport>>[number];

export const getTransactions = (userId: string, filters: ExportFilters) =>
  getTransactionsForExport(userId, filters);

export const CSV_HEADER = '"Ngày","Loại","Số tiền","Danh mục","Ví","Người bán","Ghi chú","Nguồn"';

function escapeCSVField(value: string | null | undefined): string {
  const str = (value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

export function formatCSVRow(t: TransactionRow): string {
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
    `"${amount}"`,
    escapeCSVField(category),
    escapeCSVField(wallet),
    escapeCSVField(merchant),
    escapeCSVField(note),
    escapeCSVField(source),
  ].join(',');
}
