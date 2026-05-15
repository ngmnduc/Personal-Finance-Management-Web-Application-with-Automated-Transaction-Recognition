import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<FormValues>({
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
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl [&>button]:text-white [&>button]:hover:text-slate-300">
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
            <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-full border border-slate-200">
              {(['MONTHLY', 'WEEKLY'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue('period', p)}
                  disabled={isEdit}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-200 capitalize ${
                    watchedPeriod === p
                      ? 'bg-[#0f1f3d] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
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
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 focus-visible:ring-1 focus-visible:ring-[#0f1f3d] w-full [&>span]:text-slate-800 text-sm disabled:opacity-60">
                    <SelectValue placeholder="Select expense category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Spending Limit</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl bg-white h-11 px-4 focus-within:ring-1 focus-within:ring-[#0f1f3d] transition-all">
              <span className="text-lg font-bold text-slate-300">₫</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                className="text-lg font-bold text-[#0f1f3d] w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300"
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
