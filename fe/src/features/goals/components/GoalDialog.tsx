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
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl [&>button]:text-white">

        {/* Header — Navy Split */}
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {isEdit ? 'Edit Goal' : 'Create Saving Goal'}
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1">
              {isEdit ? 'Update your saving goal details.' : 'Set a new financial target to work towards.'}
            </p>
          </DialogHeader>
        </div>

        {/* Body — White */}
        {/* Tách biệt padding px-6 py-5 trên di động và md:px-8 md:py-6 trên máy tính để tối ưu vùng hiển thị */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 md:px-8 md:py-6 flex flex-col gap-5 bg-white">

          {/* Name */}
          <div>
            <Label htmlFor="goal-name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Goal Name
            </Label>
            <Input
              id="goal-name"
              placeholder="e.g. Emergency Fund, New Laptop..."
              {...register('name')}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#0f1f3d]"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Target Amount */}
          <div>
            <Label htmlFor="goal-amount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Target Amount (VND)
            </Label>
            <Input
              id="goal-amount"
              type="number"
              placeholder="e.g. 50000000"
              {...register('targetAmount', { valueAsNumber: true })}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#0f1f3d]"
            />
            {errors.targetAmount && (
              <p className="text-xs text-red-500 mt-1">{errors.targetAmount.message}</p>
            )}
          </div>

          {/* Source Wallet — disabled in edit mode */}
          {!isEdit && (
            <div>
              <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Source Wallet</Label>
              <Select
                value={selectedWalletId || undefined}
                onValueChange={(v) => setValue('sourceWalletId', v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#0f1f3d] [&>span]:text-slate-800">
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
                <p className="text-xs text-slate-500 mt-1">
                  Available:{' '}
                  <AmountDisplay
                    value={Number(selectedWallet.currentBalance)}
                    className="font-semibold text-[#10b981]"
                  />
                </p>
              )}
              {errors.sourceWalletId && (
                <p className="text-xs text-red-500 mt-1">{errors.sourceWalletId.message}</p>
              )}
            </div>
          )}

          {/* Deadline */}
          <div>
            <Label htmlFor="goal-deadline" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Deadline <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
            </Label>
            <Input
              id="goal-deadline"
              type="date"
              {...register('deadline')}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-[#0f1f3d] pr-8"
            />
            {errors.deadline && (
              <p className="text-xs text-red-500 mt-1">{errors.deadline.message}</p>
            )}
          </div>

          {/* Actions */}
          <DialogFooter className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border-slate-200 text-slate-500 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createGoal.isPending || updateGoal.isPending}
              className="flex-1 bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
