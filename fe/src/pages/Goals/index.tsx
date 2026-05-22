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
  Target,
  MoreVertical,
  CalendarDays,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AmountDisplay from '@/components/shared/AmountDisplay'
import EmptyState from '@/components/shared/EmptyState'
import PageSkeleton from '@/components/shared/PageSkeleton'
import GoalDialog from '@/features/goals/components/GoalDialog'
import DepositDialog from '@/features/goals/components/DepositDialog'
import BudgetDialog from '@/features/budgets/components/BudgetDialog'
import { useGoals, useDeleteGoal, Goal } from '@/features/goals/api/goal.api'
import { useBudgets, useDeleteBudget, type Budget } from '@/features/budgets/api/budget.api'
import { formatVND } from '@/lib/utils'

// ─── Budget Icon Map ──────────────────────────────────────────────────────────

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

// ─── Budget Progress Bar ──────────────────────────────────────────────────────

function BudgetProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100)
  const color =
    percent > 100 ? 'bg-red-500 animate-pulse' :
      percent >= 80 ? 'bg-amber-500' :
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

// ─── Budget Status Badge ──────────────────────────────────────────────────────

function BudgetStatusBadge({ status }: { status: Budget['status'] }) {
  const config = {
    exceeded: { label: 'HIGH ALERT', className: 'bg-red-50 text-red-600 border border-red-200' },
    warning: { label: 'NEAR LIMIT', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    ok: { label: 'ON TRACK', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
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
      budget.status === 'warning' ? 'text-amber-500' :
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
            <BudgetStatusBadge status={budget.status} />
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
          <BudgetProgressBar percent={budget.percent} />
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

// ─── Budget Filter Pills ──────────────────────────────────────────────────────

type FilterValue = 'all' | 'MONTHLY' | 'WEEKLY'

const BUDGET_FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Weekly', value: 'WEEKLY' },
]

// ─── Donut Progress ───────────────────────────────────────────────────────────

function DonutProgress({ percent, size = 96, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {/* Progress Arc */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#10b981" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute text-xl font-bold text-[#0f1f3d]">{Math.round(percent)}%</div>
    </div>
  )
}

// ─── Goal Status Badge ────────────────────────────────────────────────────────

function GoalStatusBadge({ status }: { status: Goal['status'] }) {
  if (status === 'ACTIVE') return null
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${status === 'COMPLETED'
        ? 'bg-[#10b981]/10 text-[#10b981]'
        : 'bg-slate-200 text-slate-500'
        }`}
    >
      {status === 'COMPLETED' ? 'Completed' : 'Abandoned'}
    </span>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal
  onEdit: (g: Goal) => void
  onDeposit: (g: Goal) => void
  onDelete: (g: Goal) => void
}

function GoalCard({ goal, onEdit, onDeposit, onDelete }: GoalCardProps) {
  const isActive = goal.status === 'ACTIVE'
  const isCompleted = goal.status === 'COMPLETED'

  return (
    <div
      className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col gap-4 transition-opacity ${goal.status === 'ABANDONED' ? 'opacity-50' : isCompleted ? 'opacity-75' : ''
        }`}
    >
      {/* Header: name + status + menu */}
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-[#0f1f3d] text-base leading-snug line-clamp-1 flex-1">
          {goal.name}
        </h3>
        <GoalStatusBadge status={goal.status} />
        {isActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => onEdit(goal)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(goal)}
                className="text-red-500 focus:text-red-500"
              >
                Delete / Abandon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Body: Donut left, info right */}
      <div className="flex flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="shrink-0">
          <DonutProgress percent={goal.progressPercent} size={100} strokeWidth={10} />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Icon + deadline */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0f1f3d]/5 flex items-center justify-center shrink-0">
              <Target size={14} className="text-[#0f1f3d]" />
            </div>
            {goal.deadline && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <CalendarDays size={11} />
                <span>
                  {new Date(goal.deadline).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="flex flex-col 2xl:flex-row 2xl:justify-between items-start 2xl:items-end gap-2 w-full min-w-0 mt-1">
            <div className="w-full min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Current
              </p>
              <AmountDisplay
                value={goal.currentAmount}
                className="text-base font-bold text-[#0f1f3d] truncate block"
              />
            </div>
            <div className="w-full min-w-0 2xl:text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Goal
              </p>
              <AmountDisplay
                value={goal.targetAmount}
                className="text-sm text-slate-400 truncate block"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Deposit button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDeposit(goal)}
        disabled={!isActive}
        className="w-full rounded-xl border-slate-200 font-semibold text-[#0f1f3d] hover:bg-slate-50 disabled:opacity-40"
      >
        {isCompleted ? (
          <>
            <CheckCircle2 size={14} className="mr-2 text-[#10b981]" /> Goal Reached!
          </>
        ) : goal.status === 'ABANDONED' ? (
          <>
            <XCircle size={14} className="mr-2 text-slate-400" /> Abandoned
          </>
        ) : (
          'Make a Deposit'
        )}
      </Button>
    </div>
  )
}

// ─── Main Page: Planning Hub ──────────────────────────────────────────────────

export default function PlanningHubPage() {
  // ── Budget state ──
  const [budgetFilter, setBudgetFilter] = useState<FilterValue>('all')
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)

  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(budgetFilter === 'all' ? undefined : budgetFilter)
  const deleteBudgetMutation = useDeleteBudget()

  const openCreateBudget = useCallback(() => {
    setEditingBudget(undefined)
    setBudgetDialogOpen(true)
  }, [])

  const openEditBudget = useCallback((b: Budget) => {
    setEditingBudget(b)
    setBudgetDialogOpen(true)
  }, [])

  const handleDeleteBudget = useCallback((id: string) => {
    deleteBudgetMutation.mutate(id)
  }, [deleteBudgetMutation])

  // ── Goal state ──
  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const deleteGoal = useDeleteGoal()

  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [abandonGoal, setAbandonGoal] = useState<Goal | null>(null)

  const handleEditGoal = (goal: Goal) => {
    setEditGoal(goal)
    setGoalDialogOpen(true)
  }

  const handleCreateGoal = () => {
    setEditGoal(null)
    setGoalDialogOpen(true)
  }

  const handleAbandonConfirm = async () => {
    if (!abandonGoal) return
    await deleteGoal.mutateAsync(abandonGoal.id)
    setAbandonGoal(null)
  }

  const isLoading = budgetsLoading || goalsLoading
  if (isLoading) return <PageSkeleton />

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE')

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-16">

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — ACTIVE BUDGETS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0f1f3d] tracking-tight">Active Budgets</h1>
              <p className="text-slate-500 text-sm mt-1">Real-time expenditure tracking vs. allocated limits.</p>
            </div>
            <Button
              onClick={openCreateBudget}
              className="bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl flex items-center gap-2 px-5"
            >
              <Plus size={18} /> Create Budget
            </Button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            {BUDGET_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setBudgetFilter(value)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${budgetFilter === value
                  ? 'bg-[#0f1f3d] text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Budgets Grid */}
          {budgets.length === 0 ? (
            <EmptyState
              icon={<Landmark size={40} className="text-slate-400" />}
              title="No budgets set up yet"
              description="Start managing your spending today to gain deeper insights into your personal cash flow."
              action={
                <Button
                  onClick={openCreateBudget}
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
                  onEdit={openEditBudget}
                  onDelete={handleDeleteBudget}
                />
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — SAVING GOALS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Goal Tracking</p>
              <h2 className="text-3xl font-bold text-[#0f1f3d] tracking-tight">Saving Goals</h2>
              <p className="text-slate-500 text-sm mt-1">Track your financial milestones and stay on course.</p>
            </div>
            <Button
              onClick={handleCreateGoal}
              className="bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl flex items-center gap-2 px-5"
            >
              <Plus size={18} /> Create Goal
            </Button>
          </div>

          {/* Goals Grid */}
          {goals.length === 0 ? (
            <EmptyState
              icon={<Target size={40} className="text-slate-400" />}
              title="No saving goals yet"
              description="Create your first goal to start tracking your financial milestones."
              action={
                <Button
                  onClick={handleCreateGoal}
                  className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] h-10 px-5 font-semibold"
                >
                  + Create Goal
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onDeposit={setDepositGoal}
                    onDelete={setAbandonGoal}
                  />
                ))}
              </div>
            </>
          )}
        </section>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════ */}

      {/* Budget Dialog */}
      <BudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        budget={editingBudget}
      />

      {/* Goal Create / Edit Dialog */}
      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={(v) => {
          setGoalDialogOpen(v)
          if (!v) setEditGoal(null)
        }}
        goal={editGoal}
      />

      {/* Deposit Dialog */}
      {depositGoal && (
        <DepositDialog
          open={!!depositGoal}
          onOpenChange={(v) => !v && setDepositGoal(null)}
          goal={depositGoal}
        />
      )}

      {/* Abandon Confirm Dialog */}
      <AlertDialog open={!!abandonGoal} onOpenChange={(v) => !v && setAbandonGoal(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#0f1f3d]">
              Abandon Goal?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 space-y-2">
              <span>
                Are you sure you want to abandon <strong>{abandonGoal?.name}</strong>? This
                action cannot be undone.
              </span>
              {abandonGoal && abandonGoal.currentAmount > 0 && (
                <span className="block mt-3 text-[#10b981] font-semibold">
                  <AmountDisplay value={abandonGoal.currentAmount} />{' '}
                  will be refunded to your{' '}
                  <strong>{abandonGoal.sourceWallet?.name ?? 'wallet'}</strong>.
                </span>
              )}
              {abandonGoal && abandonGoal.currentAmount === 0 && (
                <span className="block mt-2 text-red-500 font-medium">
                  No amount has been saved — nothing will be refunded.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAbandonConfirm}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Abandon Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}