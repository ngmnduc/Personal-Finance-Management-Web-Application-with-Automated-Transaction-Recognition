import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { ArrowRight, Target, Activity, Download, ChevronLeft, ChevronRight, Loader2, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react'

import {
  useDashboardOverview,
  useMonthlyCharts,
  useCategoryBreakdown
} from '../../features/dashboard/api/dashboard.api'
import { useGoalsSummary } from '../../features/goals/api/goal.api'
import { useTransactions } from '../../features/transactions/api/transaction.api'
import { useWallets } from '../../features/wallets/api/wallet.api'
import {
  useRecurringSuggestions,
  useConfirmRecurringRule,
  useSnoozeSuggestion,
} from '../../features/recurring/api/recurringRule.api'
import { downloadCSV, downloadPDF, type ExportParams } from '../../features/reports/api/report.api'

import SuggestionBanner from '../../features/recurring/components/SuggestionBanner'
import PageSkeleton from '../../components/shared/PageSkeleton'
import AmountDisplay from '../../components/shared/AmountDisplay'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

import { ROUTES } from '../../lib/constants'
import { formatCurrency, lastDayOfMonth } from '../../lib/utils'

const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toMonthLabel(yyyyMM: string) {
  const parts = yyyyMM.split('-')
  if (parts.length < 2) return yyyyMM
  const m = parseInt(parts[1], 10) - 1
  return MONTH_LABELS[m] ?? yyyyMM
}

function todayYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

interface TooltipProps { active?: boolean; payload?: any[]; label?: string }

function BarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-500 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value as number)}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700">{item.name}</p>
      <p className="text-slate-500">{formatCurrency(item.value as number)}</p>
      <p className="text-slate-400">{item.payload?.percent ?? 0}%</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 sm:px-8 py-4">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  // ── Filter state ──
  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM())
  const [walletFilter, setWalletFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [exportLoading, setExportLoading] = useState<'csv' | 'pdf' | null>(null)

  const startDate = `${selectedMonth}-01`
  const endDate = lastDayOfMonth(selectedMonth)

  const exportParams: ExportParams = {
    from: startDate,
    to: endDate,
    walletId: walletFilter !== 'all' ? walletFilter : undefined,
  }

  const txFilters = {
    start_date: startDate,
    end_date: endDate,
    wallet_id: walletFilter !== 'all' ? walletFilter : undefined,
    page,
    limit: 15,
  }

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}/${d.getFullYear()}`;
      options.push({ value, label });
    }
    return options;
  }, []);

  const { data: overview, isLoading } = useDashboardOverview()
  const { data: goalsSummary = [] } = useGoalsSummary()
  const { data: suggestions = [] } = useRecurringSuggestions()
  const { data: wallets = [] } = useWallets()
  const { data: txData, isLoading: txLoading } = useTransactions(txFilters)
  const { data: monthlyCharts = [] } = useMonthlyCharts(new Date().getFullYear())
  const { data: catBreakdown = [] } = useCategoryBreakdown(selectedMonth)

  const confirmRule = useConfirmRecurringRule()
  const snoozeRule = useSnoozeSuggestion()

  if (isLoading) return <PageSkeleton />

  const totalBalance = overview?.totalBalance ?? 0
  const topWallets = overview?.wallets ?? []
  const thisMonth = overview?.this_month ?? { income: 0, expense: 0, net: 0 }
  const capitalHealth = overview?.capital_health ?? { savingsRatio: 0, burnRate: 0 }

  // Monthly velocity
  const spent = thisMonth.expense
  // Check if we have budget info, otherwise fallback to 0 to hide "allocated"
  const allocated = (thisMonth as any).budget ?? 0
  const velocityPct = allocated > 0 ? Math.min(Math.round((spent / allocated) * 100), 100) : 0

  // Chart data
  const chartData = [...monthlyCharts].slice(-6).map((m) => ({ ...m, label: toMonthLabel(m.month) }))
  const pieData = catBreakdown.slice(0, 6).map((c) => ({ name: c.name, value: c.amount, percent: c.percent }))

  // Tx pagination
  const transactions = txData?.transactions ?? []
  const totalPages = txData?.pagination?.totalPages ?? 1

  async function handleExportCSV() {
    setExportLoading('csv')
    try {
      await downloadCSV(exportParams)
      toast.success('CSV downloaded successfully')
    } catch {
      toast.error('Failed to download CSV')
    } finally {
      setExportLoading(null)
    }
  }

  async function handleExportPDF() {
    setExportLoading('pdf')
    try {
      await downloadPDF(exportParams)
      toast.success('PDF downloaded successfully')
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setExportLoading(null)
    }
  }

  return (
    <div className="p-4 md:p-8 text-slate-800 min-h-full max-w-[1400px] mx-auto bg-[#f0f4f8]">

      {/* MAIN CONTENT (Grid 3 cột: 2 Trái - 1 Phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* CỘT TRÁI */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">

          {/* Total Liquidity */}
          <Card
            className={`rounded-[2rem] shadow-sm border-0 relative overflow-hidden p-0 ${isMobile ? 'bg-[#0f1f3d] text-white' : 'bg-white'
              }`}
          >
            <CardContent className="p-6 sm:p-8 lg:p-10 flex flex-col relative z-10">
              {!isMobile && (
                <div className="absolute right-0 bottom-0 w-1/2 h-48 pointer-events-none opacity-30 text-[#10b981] z-0">
                  <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0,150 C100,50 200,100 400,20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${isMobile ? 'text-slate-300' : 'text-slate-400'}`}>
                  TOTAL BALANCE
                </h3>
                <span className="bg-[#10b981]/20 text-[#10b981] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center">
                  +12.4% ▲
                </span>
              </div>

              <h2 className={`text-[2.5rem] sm:text-[3.5rem] font-bold tracking-tight leading-none mb-6 lg:mb-10 relative z-10 truncate max-w-full ${isMobile ? 'text-white' : 'text-[#0f1f3d]'
                }`}>
                {formatCurrency(totalBalance)}
              </h2>

              {isMobile && (
                <div className="flex gap-3 mb-6 z-10 relative">
                  <Button
                    className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-xl"
                    onClick={() => navigate(ROUTES.TRANSACTIONS)}
                  >
                    + Income
                  </Button>
                  <Button
                    className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded-xl"
                    onClick={() => navigate(ROUTES.TRANSACTIONS)}
                  >
                    − Expense
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mt-auto z-10 pt-6 border-t border-slate-100/20 relative gap-4">
                <div className="flex gap-6 sm:gap-10 flex-wrap min-w-0">
                  {topWallets.slice(0, 3).map((w) => (
                    <div key={w.id} className="min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isMobile ? 'text-slate-400' : 'text-slate-400'}`}>
                        {w.name}
                      </p>
                      <p className={`text-lg font-bold truncate max-w-[120px] sm:max-w-[150px] ${isMobile ? 'text-white' : 'text-[#0f1f3d]'}`}>
                        {formatCurrency(w.currentBalance)}
                      </p>
                    </div>
                  ))}
                </div>
                {!isMobile && (
                  <Button
                    variant="link"
                    className="text-sm font-bold text-[#0f1f3d] flex items-center p-0 h-auto shrink-0"
                    onClick={() => navigate(ROUTES.WALLETS)}
                  >
                    View Wallets <ArrowRight size={16} className="ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Capital Health */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">
            <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 min-w-0">
              <CardContent className="p-6 sm:p-8 min-w-0 flex flex-col justify-center h-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">MONTHLY SPENDING</p>
                <p className="text-xl lg:text-2xl font-bold text-red-600 truncate max-w-full">
                  {formatCurrency(capitalHealth.burnRate ?? 0)}
                  <span className="text-xs md:text-sm font-normal text-slate-400 ml-1">/month</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Average spending speed</p>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 min-w-0">
              <CardContent className="p-6 sm:p-8 min-w-0 flex flex-col justify-center h-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">SAVINGS RATE</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl lg:text-2xl font-bold text-[#10b981] truncate">{capitalHealth.savingsRatio ?? 0}%</span>
                  <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">Savings rate</span>
                </div>
                <Progress value={Math.min(capitalHealth.savingsRatio ?? 0, 100)} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 overflow-visible min-w-0">
            <CardContent className="p-4 sm:px-5 sm:py-4 grid grid-cols-2 gap-3 md:flex md:flex-row md:items-center md:gap-4">
              {/* Date inputs */}
              <div className="col-span-1 min-w-0">
                <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setPage(1) }}>
                  <SelectTrigger className="w-full md:w-[120px] shrink-0 bg-slate-50 rounded-xl border-slate-200 text-sm text-[#0f1f3d] font-medium">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Wallet filter */}
              <div className="col-span-1 min-w-0">
                <Select value={walletFilter} onValueChange={(v) => { setWalletFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-full md:w-[160px] shrink-0 bg-slate-50 rounded-xl border-slate-200 text-sm text-[#0f1f3d] font-medium">
                    <SelectValue placeholder="All Wallets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wallets</SelectItem>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Export — Full width on mobile, right-aligned on desktop */}
              <div className="col-span-2 md:col-span-1 w-full md:w-auto md:ml-auto shrink-0 mt-1 md:mt-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full md:w-auto bg-[#0f1f3d] text-white hover:bg-[#1a2f57] flex items-center justify-center gap-2 font-bold whitespace-nowrap">
                      {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      Export Report
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleExportCSV} disabled={exportLoading === 'csv'} className="gap-2 cursor-pointer">
                      <FileSpreadsheet size={14} className="text-[#10b981]" />
                      Download CSV
                      {exportLoading === 'csv' && <Loader2 size={12} className="ml-auto animate-spin" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportPDF} disabled={exportLoading === 'pdf'} className="gap-2 cursor-pointer">
                      <FileText size={14} className="text-red-500" />
                      Download PDF
                      {exportLoading === 'pdf' && <Loader2 size={12} className="ml-auto animate-spin" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Income/Expense Trend (BarChart) */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 min-w-0">
            <CardContent className="p-6 sm:p-8 h-full flex flex-col">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Income/Expense Trend</p>
              {chartData.length === 0 ? (
                <div className="flex-1 min-h-[350px] md:min-h-[450px] flex items-center justify-center text-slate-300 text-sm">No data available</div>
              ) : (
                <div className="flex-1 min-h-[350px] md:min-h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="30%">
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <RechartsTooltip content={<BarTooltip />} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CỘT PHẢI */}
        <div className="lg:col-span-1 flex flex-col gap-6 min-w-0">

          {/* Monthly Velocity */}
          <Card className={`rounded-[2rem] shadow-sm border-none p-0 min-w-0 ${isMobile ? 'bg-white' : 'bg-[#0f1f3d] text-white'}`}>
            <CardContent className="p-8 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-6 ${isMobile ? 'bg-slate-100' : 'bg-white/10'}`}>
                <Activity size={18} className={isMobile ? 'text-[#0f1f3d]' : 'text-[#34d399]'} />
              </div>
              <h3 className={`text-2xl font-bold mb-6 ${isMobile ? 'text-[#0f1f3d]' : ''}`}>Budget Progress</h3>

              {allocated > 0 && (
                <>
                  <div className={`mb-2 flex items-center justify-between text-sm`}>
                    <span className={isMobile ? 'text-slate-500' : 'text-slate-400'}>Budget Pacing</span>
                    <span className="font-bold">{velocityPct}%</span>
                  </div>
                  <Progress value={velocityPct} className={`h-3 mb-8 ${isMobile ? '' : '[&>div]:bg-[#34d399] bg-slate-200'}`} />
                </>
              )}

              <div className={`grid gap-3 ${allocated > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className={`rounded-2xl p-4 flex flex-col min-w-0 ${isMobile ? 'bg-slate-50' : 'bg-white/5'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isMobile ? 'text-slate-400' : 'text-slate-400'}`}>SPENT</p>
                  <p className="text-lg md:text-xl font-bold truncate max-w-full">{formatCurrency(spent)}</p>
                </div>
                {allocated > 0 && (
                  <div className={`rounded-2xl p-4 flex flex-col min-w-0 ${isMobile ? 'bg-slate-50' : 'bg-white/5'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isMobile ? 'text-slate-400' : 'text-slate-400'}`}>ALLOCATED</p>
                    <p className="text-lg md:text-xl font-bold truncate max-w-full">{formatCurrency(allocated)}</p>
                  </div>
                )}
              </div>

              <Button
                className={`w-full rounded-xl font-bold py-6 mt-6 border-none text-sm ${isMobile
                    ? 'bg-[#0f1f3d] text-white hover:bg-[#1a2f57]'
                    : 'bg-white text-[#0f1f3d] hover:bg-slate-100'
                  }`}
                onClick={() => navigate(ROUTES.BUDGETS)}
              >
                View Budgets
              </Button>
            </CardContent>
          </Card>

          {/* Category Allocation (PieChart) */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 min-w-0">
            <CardContent className="p-6 sm:p-8 h-full flex flex-col">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Category Allocation</p>
              {pieData.length === 0 ? (
                <div className="flex-1 min-h-[180px] flex items-center justify-center text-slate-300 text-sm">No data available</div>
              ) : (
                <div className="flex-1 min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        strokeWidth={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<PieTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saving Goals */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 min-w-0">
            <CardContent className="p-8 min-w-0">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SAVING GOALS</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(ROUTES.GOALS)}
                  className="text-xs font-bold text-[#0f1f3d] hover:underline p-0 h-auto"
                >
                  View All <ArrowRight size={12} className="ml-1" />
                </Button>
              </div>

              {goalsSummary.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Target size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">No active goals yet.</p>
                  <Button
                    size="sm"
                    onClick={() => navigate(ROUTES.GOALS)}
                    className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] text-xs h-8 px-4"
                  >
                    + Create Goal
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {goalsSummary.map((goal) => (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-[#0f1f3d] truncate max-w-[60%]">{goal.name}</span>
                        <span className="text-xs font-bold text-[#10b981]">{goal.progressPercent}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                        <AmountDisplay value={goal.currentAmount} />
                        <AmountDisplay value={goal.targetAmount} />
                      </div>
                      <Progress value={Math.min(goal.progressPercent, 100)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 2. KHỐI BOTTOM CONTENT (Lịch sử giao dịch) ── */}
      <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0 mb-6 min-w-0">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-[#0f1f3d]">Transaction History</h2>
            <span className="text-xs text-slate-400 font-medium">
              {txData?.pagination?.total ?? 0} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Date', 'Description', 'Category', 'Wallet', 'Amount'].map((h) => (
                    <th key={h} className="px-6 sm:px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 sm:px-8 py-12 text-center text-slate-400 text-sm">
                      No transactions in this period.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME'
                    const label = tx.merchant || tx.category?.name || '—'
                    return (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-6 sm:px-8 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 sm:px-8 py-4 font-semibold text-[#0f1f3d] max-w-[180px] truncate">
                          {label}
                        </td>
                        <td className="px-6 sm:px-8 py-4">
                          <Badge variant="secondary">{tx.category?.name ?? '—'}</Badge>
                        </td>
                        <td className="px-6 sm:px-8 py-4 text-slate-500 text-xs">
                          {tx.wallet?.name ?? '—'}
                        </td>
                        <td className={`px-6 sm:px-8 py-4 text-right font-bold tabular-nums ${isIncome ? 'text-[#059669]' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-slate-200 text-[#0f1f3d] disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-slate-200 text-[#0f1f3d] disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Insights */}
      {suggestions.length > 0 && (
        <div className="mt-8 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Automation Insights</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.WALLETS)}
              className="text-xs font-bold text-[#0f1f3d] hover:underline p-0 h-auto"
            >
              Manage Rules <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
          {suggestions.map((s) => (
            <SuggestionBanner
              key={s.id}
              suggestion={s}
              onConfirm={(id) => confirmRule.mutate(id)}
              onSnooze={(id) => snoozeRule.mutate(id)}
              isConfirming={confirmRule.isPending}
              isSnoozing={snoozeRule.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}