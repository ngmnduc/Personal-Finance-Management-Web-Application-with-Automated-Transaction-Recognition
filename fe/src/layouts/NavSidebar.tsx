import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ScanLine, Wallet, PiggyBank, Target, BarChart3, Settings, LifeBuoy, Plus, ArrowRightLeft } from 'lucide-react'
import { ROUTES } from '../lib/constants'

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: ROUTES.DASHBOARD },
  { icon: ScanLine, label: 'Scan', path: ROUTES.SCAN },
  { icon: Wallet, label: 'Wallets', path: ROUTES.WALLETS },
  { icon: ArrowRightLeft, label: 'Transactions', path: ROUTES.TRANSACTIONS },
  { icon: PiggyBank, label: 'Budgets', path: ROUTES.BUDGETS },
  { icon: Target, label: 'Saving Goals', path: ROUTES.GOALS },
  { icon: BarChart3, label: 'Reports', path: ROUTES.REPORTS },
]

export default function NavSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="flex h-screen w-[200px] flex-col justify-between bg-navy text-white">
      <div>
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">Finman</h1>
          <p className="text-xs text-slate-400">Personal Finance</p>
        </div>

        {/* Main Nav */}
        <nav className="flex flex-col gap-1 px-3">
          {mainNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'border-l-[3px] border-brand-green bg-navy-light text-white'
                  : 'text-slate-400 hover:bg-navy-light hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* New Transaction Button */}
        <div className="px-3 pt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-green py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors">
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Bottom Links */}
      <div className="flex flex-col gap-1 px-3 pb-6 text-xs text-slate-500">
        <button className="flex items-center gap-2 px-3 py-1.5 hover:text-slate-300">
          <LifeBuoy size={14} /> Support
        </button>
        <button 
          onClick={() => navigate(ROUTES.SETTINGS)}
          className={`flex items-center gap-2 px-3 py-1.5 hover:text-slate-300 ${
            isActive(ROUTES.SETTINGS) ? 'text-brand-green' : ''
          }`}
        >
          <Settings size={14} /> Settings
        </button>
      </div>
    </aside>
  )
}