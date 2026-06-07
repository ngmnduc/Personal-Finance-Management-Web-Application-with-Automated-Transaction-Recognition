import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import AmountDisplay from '@/components/shared/AmountDisplay'
import { Goal, useDepositGoal } from '../api/goal.api'
import { VndCurrencyInput } from '@/components/shared/VndCurrencyInput'

// ─── Schema ───────────────────────────────────────────────────────────────────

const buildSchema = (maxBalance: number) =>
  z.object({
    amount: z
      .number({ invalid_type_error: 'Amount must be a number' })
      .positive('Amount must be greater than 0')
      .max(maxBalance, `Exceeds wallet balance of ${maxBalance.toLocaleString('vi-VN')} ₫`),
  })

type FormValues = { amount: number }

// ─── Props ────────────────────────────────────────────────────────────────────

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DepositDialog({ open, onOpenChange, goal }: DepositDialogProps) {
  const depositGoal = useDepositGoal()
  const walletBalance = goal.sourceWallet?.currentBalance ?? 0
  const remaining = goal.targetAmount - goal.currentAmount

  const schema = buildSchema(walletBalance)

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: undefined as unknown as number },
  })

  const onSubmit = async (values: FormValues) => {
    await depositGoal.mutateAsync({ id: goal.id, amount: values.amount })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl [&>button]:text-white">

        {/* Header — Navy Split */}
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Make a Deposit
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1">
              Add funds towards your <span className="font-semibold text-white">{goal.name}</span> goal.
            </p>
          </DialogHeader>
        </div>

        {/* Body — White */}
        {/* Tách biệt padding px-6 py-5 trên di động và md:px-8 md:py-6 trên máy tính để tối ưu vùng hiển thị */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 md:px-8 md:py-6 flex flex-col gap-5 bg-white">

          {/* Summary card — Wallet / Still needed / Progress */}
          <div className="space-y-2 bg-slate-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Wallet balance</span>
              <AmountDisplay value={walletBalance} className="font-semibold text-[#0f1f3d]" />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Still needed</span>
              <AmountDisplay
                value={remaining > 0 ? remaining : 0}
                className="font-semibold text-[#10b981]"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Progress</span>
              <span className="font-semibold text-[#0f1f3d]">{goal.progressPercent}%</span>
            </div>
          </div>

          {/* Deposit Amount */}
          <div>
            <VndCurrencyInput
              control={control}
              name="amount"
              label="Deposit Amount (VND)"
              placeholder="Enter amount..."
              error={errors.amount}
            />
            <p className="text-xs text-slate-400 mt-1">
              Wallet: <AmountDisplay value={walletBalance} className="font-medium" />
            </p>
          </div>

          {/* Actions */}
          <DialogFooter className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false) }}
              className="flex-1 rounded-xl border-slate-200 text-slate-500 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || depositGoal.isPending}
              className="flex-1 bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] disabled:opacity-60"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Deposit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
