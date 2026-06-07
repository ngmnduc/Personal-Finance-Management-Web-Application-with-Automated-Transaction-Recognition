import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateWallet, useUpdateWallet } from "../api/wallet.api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Wallet, WalletType } from "../../../types"
import { toast } from "sonner"
import { VndCurrencyInput } from "../../../components/shared/VndCurrencyInput"

const walletSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "bank", "e-wallet", "general"] as const),
  initialBalance: z.number().min(0, "Initial balance must be >= 0"),
})

type WalletFormValues = z.infer<typeof walletSchema>

interface WalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet?: Wallet | null
}

export function WalletDialog({ open, onOpenChange, wallet }: WalletDialogProps) {
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()

  const isEditing = !!wallet

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      name: "",
      type: "cash",
      initialBalance: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (wallet) {
        reset({
          name: wallet.name,
          /* Dynamically convert uppercase backend enums to lowercase select mappings */
          type: (wallet.type as string).toLowerCase().replace('_', '-') as WalletType,
          initialBalance: Number(wallet.currentBalance), /* Map to visual currentBalance field on edit */
        })
      } else {
        reset({
          name: "",
          type: "cash",
          initialBalance: 0,
        })
      }
    }
  }, [open, wallet, reset])

  const onSubmit = async (data: WalletFormValues) => {
    try {
      if (isEditing && wallet) {
        /* Map form balance value to currentBalance property key for adjustment logic */
        const payload = {
          name: data.name,
          type: data.type,
          currentBalance: data.initialBalance,
        }
        await updateWallet.mutateAsync({ id: wallet.id, ...payload })
        toast.success("Wallet updated successfully")
      } else {
        await createWallet.mutateAsync(data)
        toast.success("Wallet created successfully")
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to save wallet")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-xl [&>button]:text-white">
        <div className="bg-[#0f1f3d] px-8 py-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              {isEditing ? "Edit Wallet" : "Create Wallet"}
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1">
              {isEditing ? "Update your wallet configuration." : "Set up your account balances and asset types."}
            </p>
          </DialogHeader>
        </div>
        {/* Tách biệt padding px-6 py-5 trên mobile và md:px-8 md:py-6 trên desktop để tối ưu vùng hiển thị */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 md:px-8 md:py-6 flex flex-col gap-5 bg-white">
          <div>
            <Label htmlFor="name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Name</Label>
            <Input id="name" placeholder="e.g. Main Bank" {...register("name")} className="h-11 rounded-xl border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#0f1f3d]" />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="type" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Type</Label>
            <select
              id="type"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f1f3d] hover:border-slate-300 transition-colors"
              {...register("type")}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="e-wallet">E-Wallet</option>
              <option value="general">General</option>
            </select>
            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>}
          </div>

          <div className="w-full">
            <VndCurrencyInput
              control={control}
              name="initialBalance"
              label={isEditing ? "Actual Current Balance" : "Initial Balance"}
              error={errors.initialBalance}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57]">
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
