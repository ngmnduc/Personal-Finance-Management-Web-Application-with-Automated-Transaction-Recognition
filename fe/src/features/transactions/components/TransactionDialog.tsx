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
      <DialogContent className="max-w-lg bg-white text-slate-800 border border-slate-100 rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-[#0f1f3d]">
            {transaction ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 pt-4">
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
