import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Download, ChevronLeft, ChevronRight, Loader2, FileText, FileSpreadsheet } from 'lucide-react'

import { useDashboardOverview, useMonthlyCharts, useCategoryBreakdown } from '../../features/dashboard/api/dashboard.api'
import { useTransactions } from '../../features/transactions/api/transaction.api'
import { useWallets } from '../../features/wallets/api/wallet.api'
import { downloadCSV, downloadPDF, type ExportParams } from '../../features/reports/api/report.api'

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

import { formatCurrency, lastDayOfMonth } from '../../lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function toMonthLabel(yyyyMM: string) {
  const m = parseInt(yyyyMM.split('-')[1], 10) - 1
  return MONTH_LABELS[m] ?? yyyyMM
}

function todayYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
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

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const navigate = useNavigate()

  // ── Filter state ──
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month')
  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [walletFilter, setWalletFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [exportLoading, setExportLoading] = useState<'csv' | 'pdf' | null>(null)

  // ── Derived dates ──
  const startDate = filterMode === 'month' ? `${selectedMonth}-01` : fromDate
  const endDate   = filterMode === 'month' ? lastDayOfMonth(selectedMonth) : toDate

  // ── Build export/fetch params ──
  const exportParams: ExportParams = {
    from: startDate || undefined,
    to:   endDate   || undefined,
    walletId:  walletFilter !== 'all' ? walletFilter : undefined,
  }

  const txFilters = {
    start_date: startDate || undefined,
    end_date:   endDate   || undefined,
    wallet_id:  walletFilter !== 'all' ? walletFilter : undefined,
    page,
    limit: 15,
  }

  // ── Fetch ──
  const { data: overview }         = useDashboardOverview()
  const { data: wallets = [] }     = useWallets()
  const { data: txData, isLoading: txLoading } = useTransactions(txFilters)
  const { data: monthlyCharts = [] } = useMonthlyCharts(new Date().getFullYear())
  const { data: catBreakdown = [] }  = useCategoryBreakdown(selectedMonth)

  const capitalHealth = overview?.capital_health ?? { savingsRatio: 0, burnRate: 0 }
  const chartData     = [...monthlyCharts].slice(-6).map((m) => ({ ...m, label: toMonthLabel(m.month) }))
  const pieData       = catBreakdown.slice(0, 6).map((c) => ({ name: c.name, value: c.amount, percent: c.percent }))

  const transactions  = txData?.transactions ?? []
  const totalPages    = txData?.pagination?.totalPages ?? 1

  // ── Export handlers ──
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
    <div className="px-4 pb-4 md:px-8 md:pb-8 min-h-full bg-[#f0f4f8] max-w-[1400px] mx-auto text-slate-800">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Vault &rsaquo; Reports & History
          </p>
          <h1 className="text-3xl font-bold text-[#0f1f3d]">Reports</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-[#0f1f3d] text-white hover:bg-[#1a2f57] flex items-center gap-2 font-bold">
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} disabled={exportLoading === 'csv'} className="gap-2">
              <FileSpreadsheet size={14} className="text-[#10b981]" />
              Download CSV
              {exportLoading === 'csv' && <Loader2 size={12} className="ml-auto animate-spin" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportPDF} disabled={exportLoading === 'pdf'} className="gap-2">
              <FileText size={14} className="text-red-500" />
              Download PDF
              {exportLoading === 'pdf' && <Loader2 size={12} className="ml-auto animate-spin" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filter Bar ── */}
      <Card className="rounded-2xl border border-slate-100 bg-white mb-6 p-0">
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-100/50 rounded-full w-fit border border-slate-200/50 flex-shrink-0">
            {(['month', 'range'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setFilterMode(mode); setPage(1) }}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${
                  filterMode === mode ? 'bg-[#0f1f3d] text-white shadow-sm' : 'text-slate-500 hover:text-[#0f1f3d]'
                }`}
              >
                {mode === 'month' ? 'By Month' : 'Custom Range'}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          {filterMode === 'month' ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setPage(1) }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0f1f3d] focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/20"
            />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0f1f3d] focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/20"
              />
              <span className="text-slate-400 text-xs font-bold">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1) }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0f1f3d] focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/20"
              />
            </div>
          )}

          {/* Wallet filter */}
          <Select value={walletFilter} onValueChange={(v) => { setWalletFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 text-sm text-[#0f1f3d]">
              <SelectValue placeholder="All Wallets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wallets</SelectItem>
              {wallets.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── Capital Health + Charts (3 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Col 1: KPI cards */}
        <div className="flex flex-col gap-4">
          <Card className="rounded-2xl border border-slate-100 bg-white p-0 flex-1">
            <CardContent className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">BURN RATE</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(capitalHealth.burnRate)}<span className="text-sm font-normal text-slate-400">/month</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Average spending speed</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-100 bg-white p-0 flex-1">
            <CardContent className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">SAVINGS RATIO</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-[#10b981]">{capitalHealth.savingsRatio}%</span>
                <span className="text-xs text-slate-400">Savings rate</span>
              </div>
              <Progress value={Math.min(capitalHealth.savingsRatio, 100)} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Col 2: Monthly Bar Chart */}
        <Card className="rounded-2xl border border-slate-100 bg-white p-0">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Income/Expense Trend</p>
            {chartData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-300 text-sm">No data available</div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="30%">
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                    <RechartsTooltip content={<BarTooltip />} />
                    <Bar dataKey="income"  name="Income" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Col 3: Pie chart */}
        <Card className="rounded-2xl border border-slate-100 bg-white p-0">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Category Allocation</p>
            {pieData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-300 text-sm">No data available</div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
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
      </div>

      {/* ── Transaction Table ── */}
      <Card className="rounded-2xl border border-slate-100 bg-white p-0">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-[#0f1f3d]">Transaction History</h2>
            <span className="text-xs text-slate-400 font-medium">
              {txData?.pagination?.total ?? 0} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Date','Description','Category','Wallet','Amount'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No transactions in this period.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME'
                    const label = tx.merchant || tx.category?.name || '—'
                    return (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0f1f3d] max-w-[180px] truncate">
                          {label}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{tx.category?.name ?? '—'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {tx.wallet?.name ?? '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${isIncome ? 'text-[#059669]' : 'text-red-600'}`}>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
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
    </div>
  )
}