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
  Repeat2,
  AlertTriangle,
  Info,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import EmptyState from '../../../components/shared/EmptyState'
import PageSkeleton from '../../../components/shared/PageSkeleton'
import RecurringIncomeDialog from './RecurringIncomeDialog'
import SmartRuleDialog from './SmartRuleDialog'
import PendingSuggestionsDialog from './PendingSuggestionsDialog'
import {
  useRecurringIncomes,
  useDeleteRecurringIncome,
  useToggleRecurringIncome,
  type RecurringIncome,
} from '../api/recurringIncome.api'
import {
  useRecurringRules,
  useDeleteRecurringRule,
  useRecurringSuggestions,
  type RecurringRule,
} from '../api/recurringRule.api'
import { formatVND } from '../../../lib/utils'

// ─── Icon Map ─────────────────────────────────────────────────────────────────

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
    if (key.includes(k)) { iconCache.set(icon, v); return v }
  }
  iconCache.set(icon, Landmark)
  return Landmark
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
      <div>
        <h2 className="text-xl font-bold text-[#0f1f3d]">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps { active: boolean; onToggle: () => void }

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

// ─── Recurring Income Card (W5) ───────────────────────────────────────────────

interface RecurringCardProps {
  item: RecurringIncome
  onEdit: (item: RecurringIncome) => void
  onDelete: (item: RecurringIncome) => void
  onToggle: (id: string, current: boolean) => void
}

const RecurringCard = memo(function RecurringCard({ item, onEdit, onDelete, onToggle }: RecurringCardProps) {
  const Icon = getCategoryIcon(item.category?.icon)

  return (
    <div
      className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col gap-4 relative group transition-all duration-200 hover:shadow-md ${
        !item.isActive ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon size={22} className="text-slate-600" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
            <button onClick={(e) => { e.stopPropagation(); onEdit(item) }} className="p-1.5 rounded-lg text-slate-400 hover:text-[#0f1f3d] hover:bg-slate-100 transition-colors" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(item) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
          <ToggleSwitch active={item.isActive} onToggle={() => onToggle(item.id, item.isActive)} />
        </div>
      </div>

      <div>
        <p className={`text-lg font-bold ${item.isActive ? 'text-[#0f1f3d]' : 'text-slate-400'}`}>{item.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">Deposit to: {item.wallet.name}</p>
      </div>

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

// ─── Smart Expense Rule Row (W6) ──────────────────────────────────────────────

interface RuleRowProps {
  rule: RecurringRule
  onEdit: (rule: RecurringRule) => void
  onDelete: (rule: RecurringRule) => void
}

function RuleRow({ rule, onEdit, onDelete }: RuleRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-b border-slate-100 last:border-0">
      {/* Left */}
      <div className="flex items-start sm:items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#10b981]/10">
          <Repeat2 size={18} className="text-[#10b981]" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-[#0f1f3d] text-sm">{rule.merchant}</span>
            <span className="rounded-full bg-[#10b981]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#10b981]">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Every ~{rule.intervalDays} days
            <span className="mx-1.5 text-slate-300">•</span>
            {rule.wallet.name}
            <span className="mx-1.5 text-slate-300">•</span>
            {rule.category.icon} {rule.category.name}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5 sm:gap-6 pl-[60px] sm:pl-0">
        <div className="text-right">
          <p className="font-bold text-red-500 text-sm">{formatVND(rule.amount)}</p>
          {rule.nextDueDate && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Next:{' '}
              {new Date(rule.nextDueDate).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(rule)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[#0f1f3d]"
            title="Edit rule"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(rule)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            title="Delete rule"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RecurringTab (Main) ──────────────────────────────────────────────────────

export default function RecurringTab() {
  // ── W5: Income Automations ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringIncome | undefined>(undefined)
  const { data: incomes = [], isLoading: incomesLoading } = useRecurringIncomes()
  const deleteMutation = useDeleteRecurringIncome()
  const toggleMutation = useToggleRecurringIncome()
  const [incomeToDelete, setIncomeToDelete] = useState<RecurringIncome | null>(null)

  // ── W6: Smart Rules ──
  const [smartDialogOpen, setSmartDialogOpen] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringRule | undefined>(undefined)
  const { data: rules = [], isLoading: rulesLoading } = useRecurringRules()
  const { data: suggestions = [] } = useRecurringSuggestions()
  const deleteRuleMutation = useDeleteRecurringRule()
  const [ruleToDelete, setRuleToDelete] = useState<RecurringRule | null>(null)

  const suggestionCount = suggestions.length

  // ── Income callbacks ──
  const openCreate = useCallback(() => { setEditingItem(undefined); setDialogOpen(true) }, [])
  const openEdit = useCallback((item: RecurringIncome) => { setEditingItem(item); setDialogOpen(true) }, [])
  const handleDelete = useCallback((item: RecurringIncome) => { setIncomeToDelete(item) }, [])
  const handleToggle = useCallback((id: string, current: boolean) => {
    toggleMutation.mutate({ id, isActive: !current })
  }, [toggleMutation])

  const handleIncomeDeleteConfirm = () => {
    if (!incomeToDelete) return
    deleteMutation.mutate(incomeToDelete.id)
    setIncomeToDelete(null)
  }

  // ── Rule delete & edit ──
  const openSmartRuleEdit = useCallback((rule: RecurringRule) => { setEditingRule(rule); setSmartDialogOpen(true) }, [])

  const handleRuleDeleteConfirm = () => {
    if (!ruleToDelete) return
    deleteRuleMutation.mutate(ruleToDelete.id)
    setRuleToDelete(null)
  }

  if (incomesLoading || rulesLoading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-10">

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — INCOME AUTOMATIONS (W5 — Manual)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-6">
        <SectionHeader
          title="Income Automations"
          description="Your manually configured recurring inflows."
          action={
            <Button
              onClick={openCreate}
              className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-5 h-10 flex-shrink-0 font-semibold shadow-sm"
            >
              <Plus size={16} /> Add Income
            </Button>
          }
        />

        {incomes.length === 0 ? (
          <EmptyState
            icon={<Calendar size={40} className="text-slate-400" />}
            title="No recurring incomes yet"
            description="Set up automated monthly incomes to track your regular cash inflows."
            action={
              <Button
                onClick={openCreate}
                className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-6 h-10 font-semibold"
              >
                <Plus size={16} /> Add Income
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incomes.map((item) => (
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
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — SMART EXPENSE RULES (W6 — Auto-Detected)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-5">
        <SectionHeader
          title="Smart Expense Rules"
          description="Auto-detected recurring expenses confirmed by you."
          action={
            <Button
              onClick={() => setSuggestionsOpen(true)}
              className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-5 h-10 flex-shrink-0 font-semibold shadow-sm"
            >
              Pending Suggestions ({suggestionCount})
            </Button>
          }
        />

        {/* Amber info box */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Info size={15} className="shrink-0 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">These rules are created from auto-detected patterns.</span>{' '}
            The system will automatically create expense transactions when due.
          </p>
        </div>

        {rules.length === 0 ? (
          <EmptyState
            icon={<Repeat2 size={40} className="text-slate-400" />}
            title="No smart rules yet"
            description="Rules appear here after you confirm auto-detected patterns from the Dashboard."
          />
        ) : (
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0">
            <CardContent className="px-6 pt-2 pb-0">
              <p className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                Active Rules ({rules.length})
              </p>
              {rules.map((rule) => (
                <RuleRow key={rule.id} rule={rule} onEdit={openSmartRuleEdit} onDelete={setRuleToDelete} />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Income Dialog ── */}
      <RecurringIncomeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
      />

      {/* ── Smart Rule Dialog ── */}
      <SmartRuleDialog
        open={smartDialogOpen}
        onOpenChange={setSmartDialogOpen}
        rule={editingRule}
      />

      {/* ── Pending Suggestions Dialog ── */}
      <PendingSuggestionsDialog
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
      />

      {/* ── Delete Rule Confirm ── */}
      <AlertDialog open={!!ruleToDelete} onOpenChange={(v) => !v && setRuleToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#0f1f3d]">
              <AlertTriangle size={17} className="text-red-500" />
              Delete Smart Rule?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm leading-relaxed">
              Auto-transactions for{' '}
              <strong className="text-[#0f1f3d]">{ruleToDelete?.merchant}</strong> will stop.
              {ruleToDelete && (
                <span className="block mt-2 font-semibold text-red-500">
                  {formatVND(ruleToDelete.amount)} / {ruleToDelete.intervalDays} days will no longer
                  be auto-created.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRuleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Income Confirm ── */}
      <AlertDialog open={!!incomeToDelete} onOpenChange={(v) => !v && setIncomeToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#0f1f3d]">
              <AlertTriangle size={17} className="text-red-500" />
              Delete Income Automation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm leading-relaxed">
              Are you sure you want to delete the income automation <strong className="text-[#0f1f3d]">{incomeToDelete?.name}</strong>?
              {incomeToDelete && (
                <span className="block mt-2 font-semibold text-red-500">
                  + {formatVND(incomeToDelete.amount)} will no longer be auto-deposited.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleIncomeDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete Income
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
