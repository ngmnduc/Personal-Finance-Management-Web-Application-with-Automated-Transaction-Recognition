import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import TransactionForm from './TransactionForm'
import { Transaction } from '../../../types'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction
}

export default function TransactionDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl [&>button]:text-white">
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {transaction ? 'Edit Transaction' : 'New Transaction'}
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1">
              {transaction ? 'Adjust your logged financial record.' : 'Log a new cash flow movement into your records.'}
            </p>
          </DialogHeader>
        </div>
        {/* Tối ưu khoảng đệm di động giúp form hiển thị rộng rãi và đẹp mắt hơn */}
        <div className="px-6 pb-6 pt-4 md:px-8 md:pb-6 md:pt-6 bg-white">
          <TransactionForm
            transaction={transaction}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
