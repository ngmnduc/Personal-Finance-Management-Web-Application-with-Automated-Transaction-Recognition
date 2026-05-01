import { useState, memo, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Landmark,
  ShoppingBag,
  TrendingUp,
  Home,
  Briefcase,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '../../../components/ui/button'
import EmptyState from '../../../components/shared/EmptyState'
import PageSkeleton from '../../../components/shared/PageSkeleton'
import RecurringIncomeDialog from './RecurringIncomeDialog'
import {
  useRecurringIncomes,
  useDeleteRecurringIncome,
  useToggleRecurringIncome,
  type RecurringIncome,
} from '../api/recurringIncome.api'
import { formatVND } from '../../../lib/utils'

// ─── Icon Map (same pattern as Budgets, module-level cache) ───────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  salary: Briefcase,
  work: Briefcase,
  job: Briefcase,
  rental: Home,
  property: Home,
  home: Home,
  dividend: TrendingUp,
  invest: TrendingUp,
  yield: TrendingUp,
  shop: ShoppingBag,
  freelance: Zap,
}

const iconCache = new Map<string, LucideIcon>()

function getCategoryIcon(icon?: string | null): LucideIcon {
  if (!icon || typeof icon !== 'string' || icon.trim() === '') return Landmark
  if (iconCache.has(icon)) return iconCache.get(icon)!
  const key = icon.trim().toLowerCase()
  for (const [k, v] of Object.entries(ICON_MAP)) {
    if (key.includes(k)) {
      iconCache.set(icon, v)
      return v
    }
  }
  iconCache.set(icon, Landmark)
  return Landmark
}

// ─── Ordinal suffix helper ────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  active: boolean
  onToggle: () => void
}

function ToggleSwitch({ active, onToggle }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      aria-label={active ? 'Disable' : 'Enable'}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] ${
        active ? 'bg-[#10b981]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ─── Recurring Income Card ────────────────────────────────────────────────────

interface RecurringCardProps {
  item: RecurringIncome
  onEdit: (item: RecurringIncome) => void
  onDelete: (id: string) => void
  onToggle: (id: string, current: boolean) => void
}

const RecurringCard = memo(function RecurringCard({ item, onEdit, onDelete, onToggle }: RecurringCardProps) {
  const Icon = getCategoryIcon(item.category?.icon)

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      onDelete(item.id)
    }
  }, [item.id, item.name, onDelete])

  return (
    <div
      className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col gap-4 relative group transition-all duration-200 hover:shadow-md ${
        !item.isActive ? 'opacity-60' : ''
      }`}
    >
      {/* Action Buttons (hover reveal) */}
      <div className="absolute top-4 right-14 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(item) }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0f1f3d] hover:bg-slate-100 transition-colors"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete() }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Top Row: Icon + Toggle */}
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon size={22} className="text-slate-600" />
        </div>
        <ToggleSwitch active={item.isActive} onToggle={() => onToggle(item.id, item.isActive)} />
      </div>

      {/* Middle Row: Name + Wallet */}
      <div>
        <p className={`text-lg font-bold ${item.isActive ? 'text-[#0f1f3d]' : 'text-slate-400'}`}>
          {item.name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Deposit to: {item.wallet.name}</p>
      </div>

      {/* Bottom Row: Amount + Schedule */}
      <div>
        <p className={`text-2xl font-bold ${item.isActive ? 'text-[#10b981]' : 'text-slate-400'}`}>
          + {formatVND(item.amount)}
        </p>
        <span className="inline-block mt-2 bg-slate-100 text-slate-500 text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest font-bold">
          On the {ordinal(item.dayOfMonth)} of every month
        </span>
      </div>
    </div>
  )
})

// ─── RecurringTab ─────────────────────────────────────────────────────────────

export default function RecurringTab() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringIncome | undefined>(undefined)

  const { data: items = [], isLoading } = useRecurringIncomes()
  const deleteMutation = useDeleteRecurringIncome()
  const toggleMutation = useToggleRecurringIncome()

  const openCreate = useCallback(() => {
    setEditingItem(undefined)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((item: RecurringIncome) => {
    setEditingItem(item)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const handleToggle = useCallback((id: string, current: boolean) => {
    toggleMutation.mutate({ id, isActive: !current })
  }, [toggleMutation])

  if (isLoading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-6">

      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0f1f3d]">Recurring Incomes</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage your automated monthly cash inflows.</p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#10b981] text-white hover:bg-[#0ea572] rounded-xl px-5 h-10 flex-shrink-0 font-semibold shadow-sm"
        >
          <Plus size={16} /> Add Income
        </Button>
      </div>

      {/* ── Content ── */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} className="text-slate-400" />}
          title="No recurring incomes yet"
          description="Set up automated monthly incomes to track your regular cash inflows."
          action={
            <Button
              onClick={openCreate}
              className="gap-2 bg-[#10b981] text-white hover:bg-[#0ea572] rounded-xl px-6 h-10 font-semibold"
            >
              <Plus size={16} /> Add Income
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <RecurringCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* ── Dialog ── */}
      <RecurringIncomeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
      />
    </div>
  )
}
