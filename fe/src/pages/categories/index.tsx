import { useState, useRef, useEffect } from "react"
import { useCategories, useDeleteCategory } from "../../features/categories/api/category.api"
import { CategoryDialog } from "../../features/categories/components/CategoryDialog"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import PageSkeleton from "../../components/shared/PageSkeleton"
import { Category, TransactionType } from "../../types"
import {
  Plus, Edit2, Trash2, Lock, MoreVertical,
  // Picker icons
  Coffee, ShoppingCart, Car, DollarSign, Home, Phone,
  HeartPulse, GraduationCap, Briefcase, Gift, Zap,
  Utensils, PawPrint, Smartphone, BriefcaseMedical, HeartHandshake, ShoppingBag,
  // System seed icons
  Gamepad2, BookOpen, Shirt, Wifi, Plane, CircleEllipsis,
  Banknote, Trophy, Laptop, TrendingUp, Store, ArrowDownCircle,
} from "lucide-react"

// ── Icon registry ──────────────────────────────────────────────────────────────
// Keys include both the picker PascalCase names AND the kebab-case slugs from seed.ts
const ICON_MAP: Record<string, React.ElementType> = {
  // Custom-category picker names (PascalCase)
  Coffee,
  ShoppingCart,
  Car,
  DollarSign,
  Home,
  Phone,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Gift,
  Zap,
  Utensils,
  PawPrint,
  Smartphone,
  BriefcaseMedical,
  HeartHandshake,
  ShoppingBag,

  // System seed slugs (kebab-case from prisma/seed.ts)
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  home: Home,
  shirt: Shirt,
  wifi: Wifi,
  plane: Plane,
  gift: Gift,
  "circle-ellipsis": CircleEllipsis,
  banknote: Banknote,
  trophy: Trophy,
  laptop: Laptop,
  "trending-up": TrendingUp,
  store: Store,
  "arrow-down-circle": ArrowDownCircle,
}

function resolveIcon(raw: string): React.ElementType {
  if (!raw) return DollarSign
  // 1. Exact match (handles both kebab-case slugs and PascalCase picker names)
  if (ICON_MAP[raw]) return ICON_MAP[raw]
  // 2. PascalCase fallback: "shoppingBag" → "ShoppingBag"
  const pascal = raw.charAt(0).toUpperCase() + raw.slice(1)
  if (ICON_MAP[pascal]) return ICON_MAP[pascal]
  return DollarSign
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TransactionType>("EXPENSE")
  const { data: categories, isLoading } = useCategories(activeTab)
  const deleteCategory = useDeleteCategory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (isLoading) return <PageSkeleton />

  const safeCategories = categories || []
  const sortedCategories = [...safeCategories].sort((a, b) => {
    if (!a.userId && b.userId) return -1
    if (a.userId && !b.userId) return 1
    return a.name.localeCompare(b.name)
  })

  const handleEdit = (c: Category, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCategory(c)
    setActiveDropdown(null)
    setDialogOpen(true)
  }

  const handleDelete = (c: Category, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Delete category "${c.name}"?`)) {
      deleteCategory.mutate(c.id)
    }
    setActiveDropdown(null)
  }

  const openCreate = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveDropdown(activeDropdown === id ? null : id)
  }

  const isExpense = activeTab === "EXPENSE"
  const iconWrapClass = isExpense
    ? "text-red-500 bg-red-50"
    : "text-emerald-600 bg-emerald-50"

  return (
    <div className="p-8 text-slate-800 min-h-full max-w-[1400px] mx-auto bg-[#f0f4f8]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1f3d]">Category Management</h1>
          <p className="text-slate-500 mt-2">Organize and manage your income and expenses systematically.</p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-5 h-10 text-sm font-semibold"
        >
          <Plus size={18} /> Add New Category
        </Button>
      </div>

      {/* ── Pill Tab Switcher ── */}
      <div className="mb-8 inline-flex items-center bg-white rounded-full border border-slate-100 shadow-sm p-1 gap-1">
        <button
          onClick={() => setActiveTab("EXPENSE")}
          className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
            activeTab === "EXPENSE"
              ? "bg-slate-100 text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab("INCOME")}
          className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
            activeTab === "INCOME"
              ? "bg-slate-100 text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Income
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedCategories.map((c) => {
          const Icon = resolveIcon(c.icon)
          const isSystem = !c.userId

          return (
            <Card
              key={c.id}
              className="relative bg-white rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow h-[160px] p-0 overflow-visible"
            >
              <CardContent className="flex flex-col justify-between h-full p-6">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconWrapClass}`}>
                    <Icon size={22} />
                  </div>

                  {/* Badge / Actions */}
                  {isSystem ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      <Lock size={11} /> System
                    </span>
                  ) : (
                    <div
                      className="flex items-center gap-2 relative"
                      ref={activeDropdown === c.id ? dropdownRef : null}
                    >
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Custom
                      </span>
                      <button
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
                        onClick={(e) => toggleDropdown(c.id, e)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeDropdown === c.id && (
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1 overflow-hidden">
                          <Button
                            variant="ghost" size="sm"
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-start gap-2 h-auto rounded-none"
                            onClick={(e) => handleEdit(c, e)}
                          >
                            <Edit2 size={14} /> Edit
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-start gap-2 h-auto rounded-none"
                            onClick={(e) => handleDelete(c, e)}
                          >
                            <Trash2 size={14} /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom: name + type label */}
                <div>
                  <h3 className="text-base font-bold text-[#0f1f3d] leading-snug">{c.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {c.type === "EXPENSE" ? "Expense" : "Income"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Create New dashed card */}
        <Card
          onClick={openCreate}
          className="bg-transparent rounded-[2rem] border-2 border-dashed border-slate-300 hover:border-[#10b981] hover:shadow-md transition-all cursor-pointer h-[160px] p-0"
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-6 gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
              <Plus size={20} className="text-slate-600" />
            </div>
            <span className="font-semibold text-sm text-slate-500">Create New</span>
          </CardContent>
        </Card>
      </div>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        defaultType={activeTab}
      />
    </div>
  )
}
