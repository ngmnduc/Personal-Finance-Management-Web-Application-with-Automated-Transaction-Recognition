import { useState, useRef, useEffect } from "react"
import { useWallets, useSetDefaultWallet, useDeleteWallet } from "../../features/wallets/api/wallet.api"
import { useUiStore } from "../../store/ui.store"
import { WalletDialog } from "../../features/wallets/components/WalletDialog"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import PageSkeleton from "../../components/shared/PageSkeleton"
import { Wallet } from "../../types"
import { Plus, Edit2, Trash2, Archive, Star, Building2, Landmark, Wallet as WalletIcon, Smartphone, CreditCard } from "lucide-react"

export default function WalletsPage() {
  const { data: wallets, isLoading } = useWallets()
  const { selectedWalletId, setSelectedWallet } = useUiStore()
  
  const setDefaultWallet = useSetDefaultWallet()
  const deleteWallet = useDeleteWallet()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  
  // Pagination
  const [currentPage] = useState(1) // Keep logic, ignore UI update for simple display
  const itemsPerPage = 100 // Show all for now based on mockup

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

  const safeWallets = wallets || []
  
  const displayedWallets = safeWallets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleEdit = (w: Wallet, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingWallet(w)
    setActiveDropdown(null)
    setDialogOpen(true)
  }

  const handleSetDefault = (w: Wallet, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!w.isDefault) {
      setDefaultWallet.mutate(w.id)
    }
    setActiveDropdown(null)
  }

  const handleDelete = (w: Wallet, e: React.MouseEvent) => {
    e.stopPropagation()
    const balance = Number(w.currentBalance)
    if (balance > 0) {
      const confirmArchive = window.confirm(`Wallet ${w.name} has a balance of ${balance}. Archive instead?`)
      if (confirmArchive) {
        deleteWallet.mutate(w.id)
      }
    } else {
      if (window.confirm("Are you sure you want to delete this wallet?")) {
        deleteWallet.mutate(w.id)
      }
    }
    setActiveDropdown(null)
  }

  const openCreate = () => {
    setEditingWallet(null)
    setDialogOpen(true)
  }

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveDropdown(activeDropdown === id ? null : id)
  }

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark size={20} className="text-white" />
      case 'e-wallet': return <Smartphone size={20} className="text-white" />
      case 'cash': return <WalletIcon size={20} className="text-white bg-[#86efac]/20" /> // Using generic icon
      default: return <CreditCard size={20} className="text-white" />
    }
  }
  
  const getWalletColor = (type: string) => {
    switch (type) {
      case 'bank': return 'bg-[#0f1f3d]' // Dark navy for bank
      case 'e-wallet': return 'bg-[#f87171]' // Red for e-wallet
      case 'cash': return 'bg-[#4ade80]' // Green for cash/physical
      default: return 'bg-[#a78bfa]' // Purple for general
    }
  }

  const getWalletBadgeType = (type: string) => {
    return type === 'cash' ? 'PHYSICAL' : 'DIGITAL'
  }

  return (
    <div className="p-8 text-slate-800 min-h-full bg-[#f8fafc]">
      <div className="mb-8">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ASSET OVERVIEW</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0f1f3d]">Financial Repositories</h1>
          <Button onClick={openCreate} className="gap-2 bg-[#0f1f3d] text-white hover:bg-[#1a2f57] rounded-xl px-5 h-10 w-full sm:w-auto flex-shrink-0">
            <Plus size={18} /> Add New Wallet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Wallet Grid */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          {displayedWallets.map((w) => (
            <Card 
              key={w.id} 
              onClick={() => setSelectedWallet(w.id)}
              className={`relative bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md hover:border-[#10b981] cursor-pointer ${selectedWalletId === w.id ? 'ring-2 ring-[#10b981] border-transparent' : ''}`}
            >
              <div className="absolute inset-x-0 bottom-0 bg-slate-50/50 h-24 rounded-b-2xl pointer-events-none" style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
              
              <CardContent className="p-4 sm:p-6 z-10 flex flex-col h-full justify-between relative">
                <div>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getWalletColor(w.type)}`}>
                      {getWalletIcon(w.type)}
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#86efac]/20 text-[#166534]`}>
                      {getWalletBadgeType(w.type)}
                    </span>
                  </div>
                </div>
              
              <div className="mt-8 relative z-10">
                <p className="text-sm font-semibold text-slate-600 mb-1 flex items-center gap-2">
                  {w.name} {w.isDefault && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-bold tracking-tight text-[#0f1f3d] leading-none mb-4 lg:mb-6 break-all">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(w.currentBalance))}
                </h3>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 lg:pt-4 gap-2">
                  <div className="flex items-center text-xs sm:text-sm font-medium text-slate-500 min-w-0">
                    <span className="text-[#10b981] flex items-center">
                       <TrendingUpIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> +12.4% 
                    </span>
                    <span className="ml-1 text-slate-400 truncate">this month</span>
                  </div>
                  
                  <div className="relative flex-shrink-0" ref={activeDropdown === w.id ? dropdownRef : null}>
                    <button 
                      className="text-[#0f1f3d] font-bold text-sm tracking-wide hover:underline focus:outline-none"
                      onClick={(e) => toggleDropdown(w.id, e)}
                    >
                      Manage
                    </button>
                    
                    {activeDropdown === w.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1 overflow-hidden origin-bottom-right">
                        {!w.isDefault && (
                          <Button 
                            variant="ghost" size="sm"
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-start gap-2 h-auto rounded-none"
                            onClick={(e) => handleSetDefault(w, e)}
                          >
                            <Star size={14} /> Set Default
                          </Button>
                        )}
                        <Button 
                          variant="ghost" size="sm"
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-start gap-2 h-auto rounded-none"
                          onClick={(e) => handleEdit(w, e)}
                        >
                          <Edit2 size={14} /> Edit
                        </Button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <Button 
                          variant="ghost" size="sm"
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-start gap-2 h-auto rounded-none"
                          onClick={(e) => handleDelete(w, e)}
                        >
                          {Number(w.currentBalance) > 0 ? <Archive size={14} /> : <Trash2 size={14} />} 
                          {Number(w.currentBalance) > 0 ? 'Archive' : 'Delete'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}

          {/* Connect Institution Box */}
          <div 
            onClick={openCreate}
            className="bg-transparent rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col items-center justify-center cursor-pointer min-h-[240px] text-slate-400"
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
              <Plus size={24} className="text-slate-500" />
            </div>
            <span className="font-semibold text-sm">Connect Institution</span>
          </div>
        </div>
        
        {/* Right Side Widgets Placeholder (based on mockup image features) */}
        <div className="col-span-1 flex flex-col gap-6 mt-2 lg:mt-0">
          <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 h-56 lg:h-64 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">NET DISTRIBUTION</h3>
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
              Chart Placeholder
            </div>
          </div>
          
          <div className="bg-[#0f1f3d] rounded-2xl p-5 lg:p-6 shadow-sm h-56 lg:h-64 flex flex-col text-white relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-[rgba(16,185,129,0.2)] to-transparent pointer-events-none"></div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 relative z-10">MONTHLY VELOCITY</h3>
             <div className="flex-1 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 relative z-10">
               Bar Chart Placeholder
             </div>
          </div>
        </div>
      </div>

      <WalletDialog open={dialogOpen} onOpenChange={setDialogOpen} wallet={editingWallet} />
    </div>
  )
}

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}