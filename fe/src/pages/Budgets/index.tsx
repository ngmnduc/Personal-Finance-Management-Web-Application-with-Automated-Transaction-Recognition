import { useState, memo, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Landmark,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Gamepad2,
  Briefcase,
  Heart,
  Plane,
  BookOpen,
  Coffee,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import EmptyState from '../../components/shared/EmptyState'
import PageSkeleton from '../../components/shared/PageSkeleton'
import BudgetDialog from '../../features/budgets/components/BudgetDialog'
import { useBudgets, useDeleteBudget, type Budget } from '../../features/budgets/api/budget.api'
import { formatVND } from '../../lib/utils'

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  shopping: ShoppingCart,
  car: Car,
  home: Home,
  food: Utensils,
  dining: Utensils,
  game: Gamepad2,
  work: Briefcase,
  health: Heart,
  travel: Plane,
  education: BookOpen,
  coffee: Coffee,
  electricity: Zap,
}

const iconCache = new Map<string, LucideIcon>()

function getCategoryIcon(icon: string): LucideIcon {
  if (!icon) return Landmark
  if (iconCache.has(icon)) return iconCache.get(icon)!

  const key = icon.toLowerCase()
  for (const [k, v] of Object.entries(ICON_MAP)) {
    if (key.includes(k)) {
      iconCache.set(icon, v)
      return v
    }
  }
  
  iconCache.set(icon, Landmark)
  return Landmark
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100)
  const color =
    percent > 100 ? 'bg-red-500 animate-pulse' :
    percent >= 80  ? 'bg-amber-500' :
                     'bg-emerald-500'
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Budget['status'] }) {
  const config = {
    exceeded: { label: 'HIGH ALERT', className: 'bg-red-50 text-red-600 border border-red-200' },
    warning:  { label: 'NEAR LIMIT', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    ok:       { label: 'ON TRACK',   className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  }[status]

  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

interface BudgetCardProps {
  budget: Budget
  onEdit: (b: Budget) => void
  onDelete: (id: string) => void
}

const BudgetCard = memo(function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const Icon = getCategoryIcon(budget.category.icon)

  const amountColor =
    budget.status === 'exceeded' ? 'text-red-500' :
    budget.status === 'warning'  ? 'text-amber-500' :
                                   'text-[#0f1f3d]'

  const handleDelete = () => {
    if (window.confirm(`Delete budget for "${budget.category.name}"? This action cannot be undone.`)) {
      onDelete(budget.id)
    }
  }

  return (
    <Card className="rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <CardContent className="p-6 flex flex-col gap-4">

        {/* Top Row */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Icon size={22} className="text-slate-600" />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={budget.status} />
            {/* Action icons — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                onClick={() => onEdit(budget)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0f1f3d] hover:bg-slate-100 transition-colors"
                title="Edit budget"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete budget"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Row */}
        <div>
          <p className="text-lg font-bold text-[#0f1f3d]">{budget.category.name}</p>
          <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest font-medium">
            {budget.period.charAt(0) + budget.period.slice(1).toLowerCase()}
          </p>
          <div className="flex items-baseline gap-2 mt-3">
            <span className={`text-2xl font-bold ${amountColor}`}>
              {formatVND(budget.spent)}
            </span>
            <span className="text-sm text-slate-400">/ {formatVND(budget.amountLimit)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <ProgressBar percent={budget.percent} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{Math.round(budget.percent)}% Utilization</span>
            <span className={`text-xs font-semibold ${budget.remaining < 0 ? 'text-red-500' : 'text-slate-500'}`}>
              {budget.remaining < 0
                ? `${formatVND(Math.abs(budget.remaining))} over`
                : `${formatVND(budget.remaining)} left`
              }
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
})

// ─── Filter Pills ─────────────────────────────────────────────────────────────

type FilterValue = 'all' | 'MONTHLY' | 'WEEKLY'

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Weekly', value: 'WEEKLY' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const [filter, setFilter] = useState<FilterValue>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)

  const { data: budgets = [], isLoading } = useBudgets(filter === 'all' ? undefined : filter)
  const deleteMutation = useDeleteBudget()

  const openCreate = useCallback(() => {
    setEditingBudget(undefined)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((b: Budget) => {
    setEditingBudget(b)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  return (
    <div className="min-h-full bg-[#f0f4f8]">
      <div className="max-w-[1400px] mx-auto p-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Budget Control</p>
            <h1 className="text-3xl font-bold text-[#0f1f3d] tracking-tight">Active Budgets</h1>
            <p className="text-slate-500 text-sm mt-1">Real-time expenditure tracking vs. allocated limits.</p>
          </div>
          <Button
            onClick={openCreate}
            className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-5 h-11 flex-shrink-0 font-semibold shadow-sm"
          >
            <Plus size={18} /> Create Budget
          </Button>
        </div>

        {/* ── Filter Pills ── */}
        <div className="flex gap-2 mb-8">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                filter === value
                  ? 'bg-[#0f1f3d] text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <PageSkeleton />
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={<Landmark size={40} className="text-slate-400" />}
            title="No budgets set up yet"
            description="Start managing your spending today to gain deeper insights into your personal cash flow."
            action={
              <Button
                onClick={openCreate}
                className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-6 h-11 font-semibold"
              >
                <Plus size={16} /> Create Budget
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Dialog ── */}
      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={editingBudget}
      />
    </div>
  )
}