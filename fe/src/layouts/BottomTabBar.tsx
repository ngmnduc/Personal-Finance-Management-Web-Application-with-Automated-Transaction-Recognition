import { useNavigate, useLocation } from 'react-router-dom'
import { House, ScanLine, Wallet, BarChart3 } from 'lucide-react'
import { ROUTES } from '../lib/constants'

const tabs = [
  { icon: House, label: 'Home', path: ROUTES.DASHBOARD },
  { icon: ScanLine, label: 'Scan', path: ROUTES.SCAN },
  { icon: Wallet, label: 'Wallets', path: ROUTES.WALLETS },
  { icon: BarChart3, label: 'Reports', path: ROUTES.REPORTS },
]

export default function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
            isActive(tab.path) ? 'text-brand-green' : 'text-gray-500'
          }`}
        >
          <tab.icon size={20} strokeWidth={isActive(tab.path) ? 2.5 : 2} />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}