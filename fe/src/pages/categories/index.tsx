import { useState, useRef, useEffect } from "react"
import { useCategories, useDeleteCategory } from "../../features/categories/api/category.api"
import { CategoryDialog } from "../../features/categories/components/CategoryDialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import PageSkeleton from "../../components/shared/PageSkeleton"
import { Category, TransactionType } from "../../types"
import { Plus, Edit2, Trash2, Lock, MoreVertical, Coffee, ShoppingCart, Car, DollarSign, Home, Phone, HeartPulse, GraduationCap, Briefcase, Gift, Zap, Utensils, PawPrint, Smartphone, BriefcaseMedical, HeartHandshake, ShoppingBag } from "lucide-react"

const ICONS: Record<string, React.ElementType> = {
  Coffee, ShoppingCart, Car, DollarSign, Home, Phone, 
  HeartPulse, GraduationCap, Briefcase, Gift, Zap,
  Utensils, PawPrint, Smartphone, BriefcaseMedical, HeartHandshake, ShoppingBag
}

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

  // Default ones first, then custom
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
    if (window.confirm(`Are you sure you want to delete the category "${c.name}"?`)) {
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

  return (
    <div className="p-8 text-slate-800 min-h-full max-w-[1400px] mx-auto bg-[#f0f4f8]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1f3d]">Category Management</h1>
          <p className="text-slate-500 mt-2">Organize and manage your income and expenses systematically.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-5 h-10 text-sm font-semibold">
          <Plus size={18} /> Add New Category
        </Button>
      </div>

      <Tabs defaultValue="EXPENSE" value={activeTab} onValueChange={(v) => setActiveTab(v as TransactionType)} className="w-full">
        <TabsList className="mb-8 grid w-[300px] grid-cols-2 bg-white rounded-full border border-slate-100 shadow-sm p-1">
          <TabsTrigger value="EXPENSE" className="rounded-full data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none font-medium">Expenses</TabsTrigger>
          <TabsTrigger value="INCOME" className="rounded-full data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none font-medium">Income</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedCategories.map(c => {
              const Icon = ICONS[c.icon] || DollarSign
              const isDefault = !c.userId
              
              return (
                <Card key={c.id} className="relative bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow h-[160px] p-0 overflow-hidden">
                  <CardContent className="flex flex-col justify-between h-full p-6">
                    <div className="flex items-start justify-between">
                      <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                      style={{ borderColor: `${c.color}20`, color: c.color, backgroundColor: `${c.color}15` }}
                    >
                      <Icon size={24} />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isDefault ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <Lock size={12} /> System
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 relative" ref={activeDropdown === c.id ? dropdownRef : null}>
                          <span className="px-2.5 py-1 bg-[#e0e7ff] text-[#4f46e5] rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Custom
                          </span>
                          <button 
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
                            onClick={(e) => toggleDropdown(c.id, e)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeDropdown === c.id && (
                            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-lg border border-slate-100 z-10 py-1 overflow-hidden">
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
                  </div>
                  
                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-[#0f1f3d]">{c.name}</h3>
                      <p className="text-sm text-slate-500 mt-1 truncate">Description for {c.name}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {/* Create New Card */}
            <Card 
              onClick={openCreate}
              className="bg-transparent rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#10b981] hover:bg-green-50/30 transition-all cursor-pointer h-[160px] text-slate-500 p-0"
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-6">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Plus size={20} className="text-slate-600" />
                </div>
                <span className="font-semibold text-sm">Create New</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editingCategory} defaultType={activeTab} />
    </div>
  )
}
