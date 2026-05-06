import { useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AmountDisplay from '@/components/shared/AmountDisplay'
import { useWallets } from '@/features/wallets/api/wallet.api'
import { useCreateGoal, useUpdateGoal, Goal } from '../api/goal.api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Target amount must be greater than 0'),
  sourceWalletId: z.string().min(1, 'Please select a wallet'),
  deadline: z
    .string()
    .optional()
    .refine(
      (val) => !val || new Date(val) > new Date(),
      'Deadline must be in the future',
    ),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoalDialog({ open, onOpenChange, goal }: GoalDialogProps) {
  const isEdit = !!goal
  const { data: wallets = [] } = useWallets()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()

  // Only show active (non-archived, non-deleted) wallets
  const activeWallets = wallets.filter(
    (w) => !w.archivedAt && !w.deletedAt,
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      targetAmount: undefined,
      sourceWalletId: '',
      deadline: '',
    },
  })

  const selectedWalletId = watch('sourceWalletId')
  const selectedWallet = activeWallets.find((w) => w.id === selectedWalletId)

  // Populate form when editing
  useEffect(() => {
    if (goal) {
      reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        sourceWalletId: goal.sourceWallet?.id ?? '',
        deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
      })
    } else {
      reset({ name: '', targetAmount: undefined, sourceWalletId: '', deadline: '' })
    }
  }, [goal, open, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      targetAmount: values.targetAmount,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
    }

    if (isEdit && goal) {
      await updateGoal.mutateAsync({ id: goal.id, ...payload })
    } else {
      await createGoal.mutateAsync({ ...payload, sourceWalletId: values.sourceWalletId })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0f1f3d]">
            {isEdit ? 'Edit Goal' : 'Create Saving Goal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className="text-sm font-semibold text-[#0f1f3d]">
              Goal Name
            </Label>
            <Input
              id="goal-name"
              placeholder="e.g. Emergency Fund, New Laptop..."
              {...register('name')}
              className="rounded-xl border-slate-200"
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-amount" className="text-sm font-semibold text-[#0f1f3d]">
              Target Amount (VND)
            </Label>
            <Input
              id="goal-amount"
              type="number"
              placeholder="e.g. 50000000"
              {...register('targetAmount', { valueAsNumber: true })}
              className="rounded-xl border-slate-200"
            />
            {errors.targetAmount && (
              <p className="text-xs text-red-500">{errors.targetAmount.message}</p>
            )}
          </div>

          {/* Source Wallet — disabled in edit mode */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#0f1f3d]">Source Wallet</Label>
              <Select
                value={selectedWalletId || undefined}
                onValueChange={(v) => setValue('sourceWalletId', v, { shouldValidate: true })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Select a wallet..." />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="font-medium">{w.name}</span>
                      <span className="ml-2 text-slate-400 text-xs">
                        — <AmountDisplay value={Number(w.currentBalance)} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWallet && (
                <p className="text-xs text-slate-500">
                  Available:{' '}
                  <AmountDisplay
                    value={Number(selectedWallet.currentBalance)}
                    className="font-semibold text-[#10b981]"
                  />
                </p>
              )}
              {errors.sourceWalletId && (
                <p className="text-xs text-red-500">{errors.sourceWalletId.message}</p>
              )}
            </div>
          )}

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-deadline" className="text-sm font-semibold text-[#0f1f3d]">
              Deadline <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="goal-deadline"
              type="date"
              {...register('deadline')}
              className="rounded-xl border-slate-200"
            />
            {errors.deadline && (
              <p className="text-xs text-red-500">{errors.deadline.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createGoal.isPending || updateGoal.isPending}
              className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57]"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
