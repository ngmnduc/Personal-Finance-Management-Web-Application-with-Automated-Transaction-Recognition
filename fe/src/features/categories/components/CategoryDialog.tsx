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
  HeartPulse, GraduationCap, Briefcase, Gift, Zap,
  Utensils, PawPrint, Smartphone, BriefcaseMedical, HeartHandshake, ShoppingBag,
  Gamepad2, BookOpen, Shirt, Wifi, Plane, CircleEllipsis,
  Banknote, Trophy, Laptop, TrendingUp, Store, ArrowDownCircle,
} from "lucide-react"

// All icons available in the picker (name must match the DB slug format picker uses = PascalCase)
const ICONS = [
  { name: "Coffee",         component: Coffee },
  { name: "ShoppingBag",   component: ShoppingBag },
  { name: "ShoppingCart",  component: ShoppingCart },
  { name: "Car",           component: Car },
  { name: "DollarSign",    component: DollarSign },
  { name: "Banknote",      component: Banknote },
  { name: "Home",          component: Home },
  { name: "Phone",         component: Phone },
  { name: "Smartphone",    component: Smartphone },
  { name: "Wifi",          component: Wifi },
  { name: "HeartPulse",    component: HeartPulse },
  { name: "BriefcaseMedical", component: BriefcaseMedical },
  { name: "GraduationCap", component: GraduationCap },
  { name: "BookOpen",      component: BookOpen },
  { name: "Briefcase",     component: Briefcase },
  { name: "Laptop",        component: Laptop },
  { name: "Utensils",      component: Utensils },
  { name: "PawPrint",      component: PawPrint },
  { name: "Shirt",         component: Shirt },
  { name: "HeartHandshake", component: HeartHandshake },
  { name: "Gift",          component: Gift },
  { name: "Trophy",        component: Trophy },
  { name: "Zap",           component: Zap },
  { name: "Plane",         component: Plane },
  { name: "TrendingUp",    component: TrendingUp },
  { name: "Store",         component: Store },
  { name: "Gamepad2",      component: Gamepad2 },
  { name: "ArrowDownCircle", component: ArrowDownCircle },
  { name: "CircleEllipsis", component: CircleEllipsis },
]

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["INCOME", "EXPENSE"] as const),
  icon: z.string().min(1, "Please select an icon"),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  defaultType?: TransactionType
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  defaultType = "EXPENSE",
}: CategoryDialogProps) {
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
    },
  })

  const selectedIcon = watch("icon")
  const selectedType = watch("type")
  const isExpense = selectedType === "EXPENSE"

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          type: category.type as TransactionType,
          icon: category.icon,
        })
      } else {
        reset({
          name: "",
          type: defaultType,
          icon: "DollarSign",
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
      <DialogContent className="sm:max-w-[520px] rounded-[2rem] border border-slate-100 shadow-xl p-0 overflow-hidden bg-white">

        {/* Dialog Header */}
        <DialogHeader className="px-8 pt-8 pb-0">
          <DialogTitle className="text-xl font-bold text-[#0f1f3d]">
            {isEditing ? "Edit Category" : "New Category"}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing
              ? "Update your category details below."
              : "Create a custom category to track your transactions."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 pt-6 space-y-6">

          {/* ── Type Toggle ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Transaction Type
            </p>
            <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-full border border-slate-200">
              <button
                type="button"
                onClick={() => setValue("type", "EXPENSE")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                  isExpense
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setValue("type", "INCOME")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                  !isExpense
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Income
              </button>
            </div>
            {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
          </div>

          {/* ── Name Input ── */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
            >
              Category Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Groceries, Freelance..."
              className="rounded-xl border-slate-200 bg-[#f1f5f9] focus-visible:ring-1 focus-visible:ring-[#0f1f3d] h-11 text-[#0f1f3d]"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* ── Icon Picker ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Icon</p>
            <div className="grid grid-cols-8 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {ICONS.map(({ name, component: IconComp }) => {
                const isSelected = selectedIcon === name
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => setValue("icon", name)}
                    className={`flex aspect-square items-center justify-center rounded-xl border transition-all ${
                      isSelected
                        ? isExpense
                          ? "border-red-400 bg-red-50 text-red-500 shadow-sm"
                          : "border-emerald-400 bg-emerald-50 text-emerald-600 shadow-sm"
                        : "border-slate-200 bg-[#f1f5f9] text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-white"
                    }`}
                  >
                    <IconComp size={18} />
                  </button>
                )
              })}
            </div>
            {errors.icon && <p className="text-xs text-red-500">{errors.icon.message}</p>}
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] px-6 font-semibold"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
