import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateCategory, useUpdateCategory } from "../api/category.api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Category, TransactionType } from "../../../types"
import { toast } from "sonner"
import { 
  Coffee, ShoppingCart, Car, DollarSign, Home, Phone, 
  HeartPulse, GraduationCap, Briefcase, Gift, Zap
} from "lucide-react"

const ICONS = [
  { name: "Coffee", component: Coffee },
  { name: "ShoppingCart", component: ShoppingCart },
  { name: "Car", component: Car },
  { name: "DollarSign", component: DollarSign },
  { name: "Home", component: Home },
  { name: "Phone", component: Phone },
  { name: "HeartPulse", component: HeartPulse },
  { name: "GraduationCap", component: GraduationCap },
  { name: "Briefcase", component: Briefcase },
  { name: "Gift", component: Gift },
  { name: "Zap", component: Zap },
]

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["INCOME", "EXPENSE"] as const),
  icon: z.string().min(1, "Icon is required"),
  color: z.string(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  defaultType?: TransactionType
}

export function CategoryDialog({ open, onOpenChange, category, defaultType = "EXPENSE" }: CategoryDialogProps) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const isEditing = !!category

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: defaultType,
      icon: "DollarSign",
      color: "#10b981", // default brand green
    },
  })

  const selectedIcon = watch("icon")
  const selectedType = watch("type")

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          type: category.type as TransactionType,
          icon: category.icon,
          color: category.color || "#10b981",
        })
      } else {
        reset({
          name: "",
          type: defaultType,
          icon: "DollarSign",
          color: "#10b981",
        })
      }
    }
  }, [open, category, defaultType, reset])

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({ id: category.id, ...data })
        toast.success("Category updated successfully")
      } else {
        await createCategory.mutateAsync(data)
        toast.success("Category created successfully")
      }
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to save category")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Category" : "Create Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="flex gap-4 p-1 bg-navy-light rounded-md">
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-sm text-sm font-medium transition-all ${selectedType === "EXPENSE" ? "bg-red-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                onClick={() => setValue("type", "EXPENSE")}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-sm text-sm font-medium transition-all ${selectedType === "INCOME" ? "bg-brand-green text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                onClick={() => setValue("type", "INCOME")}
              >
                Income
              </button>
            </div>
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Groceries" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-3">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((iconConf) => {
                const IconComp = iconConf.component
                const isSelected = selectedIcon === iconConf.name
                return (
                  <button
                    key={iconConf.name}
                    type="button"
                    onClick={() => setValue("icon", iconConf.name)}
                    className={`flex aspect-square items-center justify-center rounded-md border transition-all ${
                      isSelected 
                        ? "border-brand-green bg-brand-green/20 text-brand-green" 
                        : "border-slate-700 bg-navy-light text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <IconComp size={20} />
                  </button>
                )
              })}
            </div>
            {errors.icon && <p className="text-sm text-red-500">{errors.icon.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
