import { useState } from 'react'
import { Target, MoreVertical, CalendarDays, CheckCircle2, XCircle } from 'lucide-react'
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
import { useGoals, useDeleteGoal, Goal } from '@/features/goals/api/goal.api'

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent, height = 'h-2' }: { percent: number; height?: string }) {
  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height}`}>
      <div
        className="bg-[#10b981] rounded-full h-full transition-all duration-500"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Goal['status'] }) {
  if (status === 'ACTIVE') return null
  return (
    <span
      className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
        status === 'COMPLETED'
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
      className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col gap-4 transition-opacity ${
        goal.status === 'ABANDONED' ? 'opacity-50' : isCompleted ? 'opacity-75' : ''
      }`}
    >
      {/* Row 1: Name + menu */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[#0f1f3d]/5 flex items-center justify-center shrink-0">
          <Target size={16} className="text-[#0f1f3d]" />
        </div>
        <h3 className="font-bold text-[#0f1f3d] text-base leading-snug line-clamp-1">
          {goal.name}
        </h3>
        <StatusBadge status={goal.status} />
        {isActive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
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

      {/* Row 2: Deadline */}
      {goal.deadline && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarDays size={12} />
          <span>
            Target:{' '}
            {new Date(goal.deadline).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {/* Row 3: Saved / Target */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            SAVED
          </p>
          <AmountDisplay
            value={goal.currentAmount}
            className="text-lg font-bold text-[#0f1f3d]"
          />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            TARGET
          </p>
          <AmountDisplay value={goal.targetAmount} className="text-sm text-slate-400" />
        </div>
      </div>

      {/* Row 4: Progress bar */}
      <div className="space-y-1">
        <ProgressBar percent={goal.progressPercent} />
        <p className="text-[11px] font-semibold text-[#10b981]">
          {goal.progressPercent}% Funded
        </p>
      </div>

      {/* Row 5: Deposit button */}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  const deleteGoal = useDeleteGoal()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [abandonGoal, setAbandonGoal] = useState<Goal | null>(null)

  if (isLoading) return <PageSkeleton />

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE')
  const topGoal = activeGoals.length
    ? [...activeGoals].sort((a, b) => b.progressPercent - a.progressPercent)[0]
    : null

  const handleEdit = (goal: Goal) => {
    setEditGoal(goal)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditGoal(null)
    setDialogOpen(true)
  }

  const handleAbandonConfirm = async () => {
    if (!abandonGoal) return
    await deleteGoal.mutateAsync(abandonGoal.id)
    setAbandonGoal(null)
  }

  return (
    <div className="min-h-full bg-[#f0f4f8]">
      <div className="max-w-[1400px] mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0f1f3d]">Saving Goals</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Track your financial milestones and stay on course.
            </p>
          </div>
          <Button
            onClick={handleCreate}
            className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] h-10 px-5 font-semibold self-start sm:self-auto"
          >
            + Create Goal
          </Button>
        </div>

        {/* Upcoming Milestone Banner */}
        {topGoal && (
          <div className="bg-[#F0FDF4] rounded-3xl p-8">
            <p className="text-xs font-bold text-[#10b981] tracking-widest uppercase mb-4">
              UPCOMING MILESTONE
            </p>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-[#0f1f3d]">{topGoal.name}</h2>
                {topGoal.deadline && (
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {new Date(topGoal.deadline).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <AmountDisplay
                  value={topGoal.currentAmount}
                  className="text-3xl font-bold text-[#0f1f3d]"
                />
                <span className="text-slate-400 text-lg mx-1">/</span>
                <AmountDisplay value={topGoal.targetAmount} className="text-slate-400" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="w-full bg-slate-200 rounded-full overflow-hidden h-3">
                <div
                  className="bg-[#10b981] h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(topGoal.progressPercent, 100)}%` }}
                />
              </div>
              <p className="text-sm font-bold text-[#10b981]">
                {topGoal.progressPercent}% Funded
              </p>
            </div>
          </div>
        )}

        {/* Active Portfolios Grid */}
        {goals.length === 0 ? (
          <EmptyState
            icon={<Target size={40} className="text-slate-400" />}
            title="No saving goals yet"
            description="Create your first goal to start tracking your financial milestones."
            action={
              <Button
                onClick={handleCreate}
                className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] h-10 px-5 font-semibold"
              >
                + Create Goal
              </Button>
            }
          />
        ) : (
          <>
            <h2 className="text-lg font-bold text-[#0f1f3d]">
              Active Portfolios
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({activeGoals.length} active)
              </span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onDeposit={setDepositGoal}
                  onDelete={setAbandonGoal}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <GoalDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
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