import { Sparkles, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatVND } from '@/lib/utils'
import { RecurringSuggestion } from '../api/recurringRule.api'

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuggestionBannerProps {
  suggestion: RecurringSuggestion
  onConfirm: (id: string) => void
  onSnooze: (id: string) => void
  isConfirming: boolean
  isSnoozing: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuggestionBanner({
  suggestion,
  onConfirm,
  onSnooze,
  isConfirming,
  isSnoozing,
}: SuggestionBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1f3d] p-7 text-white shadow-lg">
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
        <span className="font-bold text-[#10b981]">{suggestion.merchant}</span>{' '}
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
          {suggestion.category.icon} {suggestion.category.name}
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
          onClick={() => onSnooze(suggestion.id)}
          disabled={isSnoozing || isConfirming}
          className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white text-xs font-semibold px-4"
        >
          {isSnoozing ? 'Snoozing...' : 'Snooze 60 Days'}
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(suggestion.id)}
          disabled={isConfirming || isSnoozing}
          className="rounded-xl bg-[#10b981] text-white hover:bg-[#0ea572] text-xs font-bold px-5 shadow-md"
        >
          {isConfirming ? 'Activating...' : 'Create Rule'}
        </Button>
      </div>
    </div>
  )
}
