import {
  Sparkles,
  Clock,
  Zap,
  Coffee,
  ShoppingCart,
  Car,
  DollarSign,
  Home,
  Phone,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Gift,
  Utensils,
  PawPrint,
  Smartphone,
  BriefcaseMedical,
  HeartHandshake,
  ShoppingBag,
  Gamepad2,
  BookOpen,
  Shirt,
  Wifi,
  Plane,
  CircleEllipsis,
  Banknote,
  Trophy,
  Laptop,
  TrendingUp,
  Store,
  ArrowDownCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatVND } from '@/lib/utils'
import {
  RecurringSuggestion,
  useConfirmRecurringRule,
  useSnoozeSuggestion,
  useRejectSuggestion,
} from '../api/recurringRule.api'

// ─── Icon Dictionary Helper ───────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  coffee: Coffee,
  shoppingcart: ShoppingCart,
  car: Car,
  dollarsign: DollarSign,
  home: Home,
  phone: Phone,
  heartpulse: HeartPulse,
  graduationcap: GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  zap: Zap,
  sparkles: Sparkles,
  utensils: Utensils,
  pawprint: PawPrint,
  smartphone: Smartphone,
  briefcasemedical: BriefcaseMedical,
  hearthandshake: HeartHandshake,
  shoppingbag: ShoppingBag,
  gamepad2: Gamepad2,
  bookopen: BookOpen,
  shirt: Shirt,
  wifi: Wifi,
  plane: Plane,
  circleellipsis: CircleEllipsis,
  banknote: Banknote,
  trophy: Trophy,
  laptop: Laptop,
  trendingup: TrendingUp,
  store: Store,
  arrowdowncircle: ArrowDownCircle,
  helpcircle: HelpCircle,
}

function resolveCategoryIcon(iconName: string): React.ComponentType<{ size?: number; className?: string }> {
  if (!iconName) return Sparkles
  const key = iconName.toLowerCase().replace(/[^a-z0-9]/g, '')
  return ICON_MAP[key] || Sparkles
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuggestionBannerProps {
  suggestion: RecurringSuggestion
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuggestionBanner({
  suggestion,
  className,
}: SuggestionBannerProps) {
  const confirmMutation = useConfirmRecurringRule()
  const snoozeMutation = useSnoozeSuggestion()
  const rejectMutation = useRejectSuggestion()

  const isPending =
    confirmMutation.isPending ||
    snoozeMutation.isPending ||
    rejectMutation.isPending

  const IconComponent = resolveCategoryIcon(suggestion.category.icon)

  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-[#0f1f3d] p-7 text-white shadow-lg ${className || ''}`}>
      {/* Decorative background sparkle */}
      <Sparkles
        size={120}
        className="absolute -right-6 -top-6 rotate-12 text-white/5 pointer-events-none"
        strokeWidth={1}
      />

      {/* Header badge */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981]/20">
          <Zap size={13} className="text-[#10b981]" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">
          Automation Insight
        </span>
      </div>

      {/* Body text */}
      <p className="mb-6 text-sm leading-relaxed text-slate-300">
        Based on your recent activity, we detected a recurring pattern for{' '}
        <span
          className="font-bold text-[#10b981] truncate inline-block max-w-[160px] align-bottom"
          title={suggestion.merchant}
        >
          {suggestion.merchant}
        </span>{' '}
        (
        <span className="font-semibold text-white">{formatVND(suggestion.amount)}</span>
        ) every ~
        <span className="font-semibold text-white">{suggestion.intervalDays}</span> days.{' '}
        Would you like to create an automated rule for this expense?
      </p>

      {/* Metadata row */}
      <div className="mb-6 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          {suggestion.wallet.name}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          <IconComponent size={12} className="shrink-0" /> {suggestion.category.name}
        </span>
        {suggestion.nextDueDate && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            Next:{' '}
            {new Date(suggestion.nextDueDate).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => rejectMutation.mutate(suggestion.id)}
          disabled={isPending}
          className="rounded-xl border-white/20 bg-transparent text-white hover:bg-red-500/20 hover:text-red-400 text-xs font-semibold px-4"
        >
          {rejectMutation.isPending ? 'Discarding...' : 'Discard'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => snoozeMutation.mutate(suggestion.id)}
          disabled={isPending}
          className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white text-xs font-semibold px-4"
        >
          {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze 60 Days'}
        </Button>
        <Button
          size="sm"
          onClick={() => confirmMutation.mutate(suggestion.id)}
          disabled={isPending}
          className="rounded-xl bg-[#10b981] text-white hover:bg-[#0ea572] text-xs font-bold px-5 shadow-md"
        >
          {confirmMutation.isPending ? 'Activating...' : 'Create Rule'}
        </Button>
      </div>
    </div>
  )
}
