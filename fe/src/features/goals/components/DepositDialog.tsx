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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AmountDisplay from '@/components/shared/AmountDisplay'
import { Goal, useDepositGoal } from '../api/goal.api'

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
    register,
    handleSubmit,
    reset,
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
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0f1f3d]">
            Make a Deposit
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{goal.name}</p>
        </DialogHeader>

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="deposit-amount" className="text-sm font-semibold text-[#0f1f3d]">
              Deposit Amount (VND)
            </Label>
            <Input
              id="deposit-amount"
              type="number"
              placeholder="Enter amount..."
              {...register('amount', { valueAsNumber: true })}
              className="rounded-xl border-slate-200"
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
            <p className="text-xs text-slate-400">
              Wallet: <AmountDisplay value={walletBalance} className="font-medium" />
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false) }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || depositGoal.isPending}
              className="bg-[#10b981] text-white rounded-xl hover:bg-[#0ea572]"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Deposit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
