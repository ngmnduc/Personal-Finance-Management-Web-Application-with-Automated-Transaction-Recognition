import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'

import { useWallets } from '../../wallets/api/wallet.api'
import { useCategories } from '../../categories/api/category.api'
import {
  useCreateRecurringIncome,
  useUpdateRecurringIncome,
  type RecurringIncome,
} from '../api/recurringIncome.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  walletId: z.string().min(1, 'Wallet is required'),
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number({ error: 'Amount is required' }).positive('Must be greater than 0'),
  dayOfMonth: z
    .number({ error: 'Day is required' })
    .int()
    .min(1, 'Min day is 1')
    .max(28, 'Max day is 28 (safe for all months)'),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurringIncomeDialogProps {
  open: boolean
  onOpenChange: (val: boolean) => void
  item?: RecurringIncome
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecurringIncomeDialog({ open, onOpenChange, item }: RecurringIncomeDialogProps) {
  const isEdit = !!item

  const { data: wallets = [] } = useWallets()
  const { data: categories = [] } = useCategories('INCOME')
  const createMutation = useCreateRecurringIncome()
  const updateMutation = useUpdateRecurringIncome()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', walletId: '', categoryId: '', amount: undefined, dayOfMonth: 1 },
  })

  const watchedWalletId = watch('walletId')
  const watchedCategoryId = watch('categoryId')

  useEffect(() => {
    if (open && item) {
      reset({
        name: item.name,
        walletId: item.wallet.id,
        categoryId: item.category.id,
        amount: item.amount,
        dayOfMonth: item.dayOfMonth,
      })
    } else if (open && !item) {
      reset({ name: '', walletId: '', categoryId: '', amount: undefined, dayOfMonth: 1 })
    }
  }, [open, item])

  const onSubmit = async (values: FormValues) => {
    if (isEdit && item) {
      await updateMutation.mutateAsync({ id: item.id, ...values })
    } else {
      await createMutation.mutateAsync({ ...values, isActive: true })
    }
    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl">
        {/* Header */}
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {isEdit ? 'Edit Recurring Income' : 'New Recurring Income'}
            </DialogTitle>
            <p className="text-slate-400 text-sm mt-1">
              {isEdit ? 'Update your automated income details.' : 'Set up a monthly income that deposits automatically.'}
            </p>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 flex flex-col gap-5 bg-white">

          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Income Name
            </label>
            <Input
              placeholder="e.g. Salary - Tech Corp"
              className="rounded-xl border-slate-200 h-11 text-sm"
              {...register('name')}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Deposit to Wallet
            </label>
            <Select value={watchedWalletId} onValueChange={(v) => setValue('walletId', v, { shouldValidate: true })}>
              <SelectTrigger className="rounded-xl border-slate-200 h-11 text-sm">
                <SelectValue placeholder="Select wallet..." />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.walletId && <p className="text-red-500 text-xs mt-1">{errors.walletId.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Category
            </label>
            <Select value={watchedCategoryId} onValueChange={(v) => setValue('categoryId', v, { shouldValidate: true })}>
              <SelectTrigger className="rounded-xl border-slate-200 h-11 text-sm">
                <SelectValue placeholder="Select income category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* Amount + Day — 2 column grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Amount (₫)
              </label>
              <div className="flex items-baseline gap-1.5 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#0f1f3d] transition-all">
                <span className="text-lg font-bold text-slate-300">₫</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  className="text-xl font-bold text-[#0f1f3d] w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-200"
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Day of Month (1–28)
              </label>
              <Input
                type="number"
                min={1}
                max={28}
                placeholder="1"
                className="rounded-xl border-slate-200 h-11 text-sm"
                {...register('dayOfMonth', { valueAsNumber: true })}
              />
              {errors.dayOfMonth && <p className="text-red-500 text-xs mt-1">{errors.dayOfMonth.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl border-slate-200 text-slate-500"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-[#10b981] text-white rounded-xl hover:bg-[#0ea572] disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />Saving...
                </span>
              ) : isEdit ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
