import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { formatVND } from '../../../lib/utils'
import {
  useRecurringSuggestions,
  useRejectSuggestion,
  useSnoozeSuggestion,
  useConfirmRecurringRule,
} from '../api/recurringRule.api'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PendingSuggestionsDialogProps {
  open: boolean
  onOpenChange: (val: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PendingSuggestionsDialog({ open, onOpenChange }: PendingSuggestionsDialogProps) {
  const { data: suggestions = [] } = useRecurringSuggestions()

  const rejectMutation = useRejectSuggestion()
  const snoozeMutation = useSnoozeSuggestion()
  const confirmMutation = useConfirmRecurringRule()

  const isPending = rejectMutation.isPending || snoozeMutation.isPending || confirmMutation.isPending

  // Nếu không còn dữ liệu (count hits zero), tự động xử lý thanh lịch hoặc báo empty.
  // Giao diện đã đóng hoặc hiển thị text.
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl">
        {/* Header Panel */}
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Pending Suggestions
            </DialogTitle>
            <p className="text-slate-400 text-sm mt-1">
              Review and act on auto-detected recurring expense patterns.
            </p>
          </DialogHeader>
        </div>

        {/* Body Content Wrapper */}
        <div className="bg-white px-8 py-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-slate-400 font-medium">No pending suggestions waiting for review.</p>
            </div>
          ) : (
            suggestions.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 py-4 border-b border-slate-100 last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-[#0f1f3d] text-base">{item.merchant}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Every ~{item.intervalDays} days
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                        {item.wallet.name}
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 flex items-center gap-1">
                        {item.category.icon} {item.category.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500 text-lg">{formatVND(item.amount)}</p>
                  </div>
                </div>

                {/* Mutation Operations Interface */}
                <div className="flex items-center gap-2 mt-2 justify-end">
                  {/* Thực thi hành động Reject */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => rejectMutation.mutate(item.id)}
                    className="h-8 rounded-lg border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs px-3"
                  >
                    Discard
                  </Button>
                  
                  {/* Thực thi hành động Snooze */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => snoozeMutation.mutate(item.id)}
                    className="h-8 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-100 text-xs px-3"
                  >
                    Snooze
                  </Button>

                  {/* Thực thi hành động Confirm */}
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => confirmMutation.mutate(item.id)}
                    className="h-8 rounded-lg bg-[#10b981] text-white hover:bg-[#0ea572] text-xs font-semibold px-4"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
