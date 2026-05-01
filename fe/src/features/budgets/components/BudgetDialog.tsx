import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'

import { useCategories } from '../../categories/api/category.api'
import { useCreateBudget, useUpdateBudget, type Budget } from '../api/budget.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  period: z.enum(['MONTHLY', 'WEEKLY']),
  categoryId: z.string().min(1, 'Category is required'),
  amountLimit: z.number({ error: 'Amount is required' }).positive('Amount must be greater than 0'),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (val: boolean) => void
  budget?: Budget
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetDialog({ open, onOpenChange, budget }: BudgetDialogProps) {
  const isEdit = !!budget

  const { data: categories = [] } = useCategories('EXPENSE')
  const createMutation = useCreateBudget()
  const updateMutation = useUpdateBudget()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { period: 'MONTHLY', categoryId: '', amountLimit: undefined },
  })

  const watchedPeriod = watch('period')
  const watchedCategoryId = watch('categoryId')

  // Pre-fill when editing
  useEffect(() => {
    if (open && budget) {
      reset({
        period: budget.period,
        categoryId: budget.categoryId,
        amountLimit: budget.amountLimit,
      })
    } else if (open && !budget) {
      reset({ period: 'MONTHLY', categoryId: '', amountLimit: undefined })
    }
  }, [open, budget])

  const onSubmit = async (values: FormValues) => {
    if (isEdit && budget) {
      await updateMutation.mutateAsync({ id: budget.id, amountLimit: values.amountLimit })
    } else {
      await createMutation.mutateAsync(values)
    }
    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl">
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {isEdit ? 'Edit Budget' : 'Create Budget'}
            </DialogTitle>
            <p className="text-slate-400 text-sm mt-1">
              {isEdit ? 'Adjust your spending limit.' : 'Set a spending limit for a category.'}
            </p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 flex flex-col gap-5 bg-white">

          {/* Period Toggle */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Period</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {(['MONTHLY', 'WEEKLY'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue('period', p)}
                  disabled={isEdit}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${
                    watchedPeriod === p
                      ? 'bg-[#0f1f3d] text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
            <Select
              value={watchedCategoryId}
              onValueChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
              disabled={isEdit}
            >
              <SelectTrigger className="rounded-xl border-slate-200 h-11 text-sm disabled:opacity-60">
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

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Spending Limit</label>
            <div className="flex items-baseline gap-2 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#0f1f3d] transition-all">
              <span className="text-2xl font-bold text-slate-300">₫</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                className="text-3xl font-bold text-[#0f1f3d] w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-200"
                {...register('amountLimit', { valueAsNumber: true })}
              />
            </div>
            {errors.amountLimit && <p className="text-red-500 text-xs mt-1">{errors.amountLimit.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl border-slate-200 text-slate-500" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-[#10b981] text-white rounded-xl hover:bg-[#0ea572] disabled:opacity-60">
              {isPending ? (
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Saving...</span>
              ) : isEdit ? 'Save Changes' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
