import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DollarSign, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { useWallets } from '../../wallets/api/wallet.api'
import { useCategories } from '../../categories/api/category.api'
import { useCreateTransaction, useUpdateTransaction } from '../api/transaction.api'
import { Transaction } from '../../../types'

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number({ error: 'Amount must be a number' }).positive('Amount must be greater than 0'),
  categoryId: z.string().min(1, 'Please select a category'),
  walletId: z.string().min(1, 'Please select a wallet'),
  transactionDate: z
    .string()
    .min(1, 'Date is required')
    .refine((val) => {
      const selected = new Date(val)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return selected <= today
    }, 'Transaction date cannot be in the future'),
  merchant: z.string().optional(),
  note: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

// ─── Props ───────────────────────────────────────────────────────────────────

interface TransactionFormProps {
  transaction?: Transaction
  onSuccess: () => void
  onCancel: () => void
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function toLocalDateString(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayString(): string {
  return toLocalDateString(new Date().toISOString())
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const isEdit = !!transaction

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: transaction?.type ?? 'EXPENSE',
      amount: transaction ? Number(transaction.amount) : undefined,
      categoryId: transaction?.categoryId ?? '',
      walletId: transaction?.walletId ?? '',
      transactionDate: transaction ? toLocalDateString(transaction.transactionDate) : todayString(),
      merchant: transaction?.merchant ?? '',
      note: transaction?.note ?? '',
    },
  })

  const watchedType = watch('type')

  // Reset categoryId when type changes
  useEffect(() => {
    setValue('categoryId', '')
  }, [watchedType, setValue])

  const { data: wallets = [] } = useWallets()
  const { data: categories = [] } = useCategories(watchedType)

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()

  const onSubmit = async (values: TransactionFormValues) => {
    if (isEdit && transaction) {
      await updateMutation.mutateAsync({ id: transaction.id, ...values })
    } else {
      await createMutation.mutateAsync(values)
    }
    onSuccess()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* Row 1: Type Toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        {(['EXPENSE', 'INCOME'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue('type', t)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${watchedType === t
                ? t === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-red-500 text-white shadow-sm'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            {t === 'INCOME' ? '↑ Income' : '↓ Expense'}
          </button>
        ))}
      </div>

      {/* Row 2: Amount */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
          Amount
        </label>
        <div className="relative">
          <DollarSign
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0"
            className="pl-9 rounded-xl border-slate-200 focus:ring-[#0f1f3d]"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>
        {errors.amount && (
          <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
        )}
      </div>

      {/* Row 3: Category */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
          Category
        </label>
        <Select
          value={watch('categoryId')}
          onValueChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
        >
          <SelectTrigger className="rounded-xl border-slate-200">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Row 4: Wallet + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Wallet
          </label>
          <Select
            value={watch('walletId')}
            onValueChange={(val) => setValue('walletId', val, { shouldValidate: true })}
          >
            <SelectTrigger className="rounded-xl border-slate-200">
              <SelectValue placeholder="Select wallet..." />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.walletId && (
            <p className="text-red-500 text-xs mt-1">{errors.walletId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Date
          </label>
          <Input
            type="date"
            max={todayString()}
            className="rounded-xl border-slate-200 focus:ring-[#0f1f3d]"
            {...register('transactionDate')}
          />
          {errors.transactionDate && (
            <p className="text-red-500 text-xs mt-1">{errors.transactionDate.message}</p>
          )}
        </div>
      </div>

      {/* Row 5: Merchant */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
          Merchant <span className="text-slate-300 normal-case font-normal">(optional)</span>
        </label>
        <Input
          type="text"
          placeholder="e.g. Grab, Netflix..."
          className="rounded-xl border-slate-200 focus:ring-[#0f1f3d]"
          {...register('merchant')}
        />
      </div>

      {/* Row 6: Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
          Note <span className="text-slate-300 normal-case font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Add a note..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1f3d] focus:ring-offset-2 resize-none"
          {...register('note')}
        />
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
          disabled={isSubmitting || isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isPending}
          className="flex-1 bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] disabled:opacity-60"
        >
          {(isSubmitting || isPending) ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </span>
          ) : (
            isEdit ? 'Update Transaction' : 'Add Transaction'
          )}
        </Button>
      </div>
    </form>
  )
}
