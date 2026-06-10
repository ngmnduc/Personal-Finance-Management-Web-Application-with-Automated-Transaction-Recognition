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
import { useUpdateRecurringRule, type RecurringRule } from '../api/recurringRule.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  merchant: z.string().min(1, 'Merchant is required').max(100),
  amount: z.number({ error: 'Amount is required' }).positive('Must be greater than 0'),
  walletId: z.string().min(1, 'Wallet is required'),
  categoryId: z.string().min(1, 'Category is required'),
  intervalDays: z.number({ error: 'Interval is required' }).int().positive('Must be positive integer'),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface SmartRuleDialogProps {
  open: boolean
  onOpenChange: (val: boolean) => void
  rule?: RecurringRule
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartRuleDialog({ open, onOpenChange, rule }: SmartRuleDialogProps) {
  const { data: wallets = [] } = useWallets()
  const { data: categories = [] } = useCategories('EXPENSE')
  const updateMutation = useUpdateRecurringRule()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { merchant: '', amount: undefined, walletId: '', categoryId: '', intervalDays: 30 },
  })

  const watchedWalletId = watch('walletId')
  const watchedCategoryId = watch('categoryId')

  useEffect(() => {
    if (open && rule) {
      reset({
        merchant: rule.merchant,
        amount: rule.amount,
        walletId: rule.wallet.id,
        categoryId: rule.category.id,
        intervalDays: rule.intervalDays,
      })
    } else if (open && !rule) {
      reset({ merchant: '', amount: undefined, walletId: '', categoryId: '', intervalDays: 30 })
    }
  }, [open, rule, reset])

  const onSubmit = async (values: FormValues) => {
    if (rule) {
      await updateMutation.mutateAsync({ id: rule.id, ...values })
      onOpenChange(false)
    }
  }

  const isPending = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl">
        {/* Header */}
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Edit Smart Rule
            </DialogTitle>
            <p className="text-slate-400 text-sm mt-1">
              Update automation details for this expense pattern.
            </p>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 flex flex-col gap-5 bg-white">

          {/* Merchant */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Merchant Name
            </label>
            <Input
              placeholder="e.g. Netflix, Spotify"
              className="rounded-xl border-slate-200 h-11 text-sm"
              {...register('merchant')}
            />
            {errors.merchant && <p className="text-red-500 text-xs mt-1">{errors.merchant.message}</p>}
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Source Wallet
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
                <SelectValue placeholder="Select expense category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* Amount + Interval — 2 column grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Amount (VND)
              </label>
              <div className="flex items-baseline gap-1.5 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#0f1f3d] transition-all">
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
                Interval (Days)
              </label>
              <Input
                type="number"
                min={1}
                placeholder="30"
                className="rounded-xl border-slate-200 h-11 text-sm"
                {...register('intervalDays', { valueAsNumber: true })}
              />
              {errors.intervalDays && <p className="text-red-500 text-xs mt-1">{errors.intervalDays.message}</p>}
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
              ) : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
