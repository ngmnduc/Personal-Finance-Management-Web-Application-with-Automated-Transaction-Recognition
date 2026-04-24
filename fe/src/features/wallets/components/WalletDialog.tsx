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
          type: wallet.type as WalletType,
          initialBalance: Number(wallet.initialBalance),
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
        await updateWallet.mutateAsync({ id: wallet.id, ...data })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Wallet" : "Create Wallet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Main Bank" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 hover:border-slate-300 transition-colors"
              {...register("type")}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="e-wallet">E-Wallet</option>
              <option value="general">General</option>
            </select>
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialBalance">Initial Balance</Label>
            <Input 
              id="initialBalance" 
              type="number" 
              step="any"
              disabled={isEditing} // usually we don't edit initial balance once set
              {...register("initialBalance", { valueAsNumber: true })} 
            />
            {errors.initialBalance && <p className="text-sm text-red-500">{errors.initialBalance.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
