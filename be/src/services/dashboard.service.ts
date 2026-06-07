import { dashboardRepository } from '../repositories/dashboard.repository';
import * as budgetRepo from '../repositories/budget.repository';
import * as goalService from './goal.service';

// ─── Helper: current month range ─────────────────────────────────────────────

function getMonthRange(date: Date = new Date()) {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth   = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { year, month, startOfMonth, endOfMonth };
}

// ─── getOverview (extended Capital Health) ────────────────────────────────────

export const getDashboardOverview = async (userId: string) => {
  const { year, month, startOfMonth, endOfMonth } = getMonthRange();

  // ── 1. Wallet totals ────────────────────────────────────────────────────────
  const [balanceAggregate, wallets] = await dashboardRepository.getWalletBalances(userId);

  const totalBalance = Number(balanceAggregate._sum.currentBalance ?? 0n);

  // ── 2. This-month income / expense ─────────────────────────────────────────
  const transactionSums = await dashboardRepository.getMonthlyTransactionsSum(userId, startOfMonth, endOfMonth);

  /* CODE COMMENT: Optimization P2.2 - Parsing consolidated type-grouped transaction sums with fallback values */
  const incomeRow = transactionSums.find((r) => r.type === 'INCOME');
  const expenseRow = transactionSums.find((r) => r.type === 'EXPENSE');

  const totalIncome  = Number(incomeRow?._sum.amount ?? 0n);
  const totalExpense = Number(expenseRow?._sum.amount ?? 0n);
  const net          = totalIncome - totalExpense;

  // ── 3. Capital health metrics ───────────────────────────────────────────────
  const savingsRatio =
    net > 0 && totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const burnRate    = Math.round(totalExpense / daysInMonth);

  // ── 4. Budget alerts (percent >= 80) ───────────────────────────────────────
  const budgets = await budgetRepo.findManyByUser(userId);
  const budgetCategoryIds = budgets.map((b) => b.categoryId);

  /* CODE COMMENT: Optimization P2.1 - Resolved N+1 query issue by using a single groupBy to fetch all category spent amounts in the current month cycle. */
  const spentGroups = await dashboardRepository.getSpentGroupedByCategories(
    userId,
    budgetCategoryIds,
    startOfMonth,
    endOfMonth
  );

  const spentMap = new Map<string, number>(
    spentGroups.map((g) => [g.categoryId!, Number(g._sum.amount ?? 0n)])
  );

  const budgetResults = budgets.map((b) => {
    const spent = spentMap.get(b.categoryId) ?? 0;
    const limit = Number(b.amountLimit);
    const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return { budget: b, spent, percent };
  });

  const budgetAlerts  = budgetResults
    .filter(({ percent }) => percent >= 80)
    .map(({ budget, percent }) => ({
      category: budget.category.name,
      percent,
      status: percent >= 100 ? 'exceeded' : 'warning',
    }));

  // ── 5. Assemble response ────────────────────────────────────────────────────
  return {
    totalBalance,
    wallets: wallets.map((w) => ({
      id:             w.id,
      name:           w.name,
      type:           w.type,
      currentBalance: Number(w.currentBalance),
      isDefault:      w.isDefault,
    })),
    this_month: {
      income:  totalIncome,
      expense: totalExpense,
      net,
    },
    capital_health: {
      savingsRatio,
      burnRate,
    },
    budget_alerts:  budgetAlerts,
    recurring_due:  [], // placeholder — to be implemented in W8
  };
};

// ─── getGoalsSummary (delegation) ────────────────────────────────────────────

export const getGoalsSummary = async (userId: string) => {
  return goalService.getGoalsSummary(userId);
};

// ─── getMonthlyCharts ─────────────────────────────────────────────────────────

export const getMonthlyCharts = async (userId: string, year: number) => {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear   = new Date(`${year}-12-31T23:59:59.999Z`);

  const rows = await dashboardRepository.getMonthlyChartsRaw(userId, startOfYear, endOfYear);

  return rows.map((row) => {
    const income  = Number(row.totalIncome);
    const expense = Number(row.totalExpense);
    // Format month as "YYYY-MM"
    const d = new Date(row.month);
    const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      month:   monthStr,
      income,
      expense,
      net: income - expense,
    };
  });
};

// ─── getCategoryBreakdown ─────────────────────────────────────────────────────

export const getCategoryBreakdown = async (userId: string, month: string) => {
  // Parse "YYYY-MM" into date range
  const [yearStr, monthStr] = month.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1; // 0-indexed

  const startDate = new Date(y, m, 1, 0, 0, 0, 0);
  const endDate   = new Date(y, m + 1, 0, 23, 59, 59, 999);

  // Group EXPENSE transactions by categoryId
  const grouped = await dashboardRepository.getExpenseGroupedByCategory(userId, startDate, endDate);

  if (grouped.length === 0) return [];

  // Fetch category details in one query
  const categoryIds = grouped.map((g) => g.categoryId).filter(Boolean) as string[];
  const categories  = await dashboardRepository.getCategoriesByIds(categoryIds);
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Calculate total for percent computation
  const total = grouped.reduce((acc, g) => acc + Number(g._sum.amount ?? 0n), 0);

  return grouped.map((g) => {
    const amount  = Number(g._sum.amount ?? 0n);
    const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
    const cat     = catMap[g.categoryId ?? ''];
    return {
      categoryId: g.categoryId,
      name:       cat?.name  ?? 'Unknown',
      icon:       cat?.icon  ?? '',
      amount,
      percent,
    };
  });
};

// ─── Re-export as object (backwards compat with existing controller) ──────────

export const dashboardService = {
  getDashboardOverview,
  getGoalsSummary,
  getMonthlyCharts,
  getCategoryBreakdown,
};