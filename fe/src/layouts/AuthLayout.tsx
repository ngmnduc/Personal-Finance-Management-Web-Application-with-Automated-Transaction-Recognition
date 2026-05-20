import { Outlet } from 'react-router-dom'
import { TrendingUp, Shield, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function BrandingPanel() {
  return (
    <div className="hidden lg:flex flex-col h-full bg-[#0f1f3d] px-12 py-10 relative overflow-hidden">
      {/* Subtle background glow orbs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-[#10b981]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 rounded-full bg-[#10b981]/8 blur-3xl pointer-events-none" />



      {/* Headline */}
      <div className="relative z-10 mt-auto mb-10">
        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
          Your finances,<br />
          <span className="text-[#10b981]">under control.</span>
        </h2>
        <p className="text-[#94a3b8] text-base leading-relaxed max-w-xs">
          Track spending, scan receipts with AI, set savings goals — all in one beautiful dashboard.
        </p>
      </div>

      {/* CSS Mockup Cards */}
      <div className="relative z-10 space-y-3 mb-6">
        {/* Balance Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[#64748b] uppercase tracking-widest">Total Balance</p>
            <div className="flex items-center gap-1 text-[#10b981] text-xs font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +12.4%
            </div>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">$48,290.00</p>
          <div className="mt-4 flex gap-1">
            {[40, 65, 45, 75, 55, 80, 60, 90, 70, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h * 0.5}px`,
                  background: i === 9 ? '#10b981' : `rgba(16,185,129,${0.15 + i * 0.07})`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Two mini cards row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-[#10b981]" />
              </div>
              <span className="text-xs text-[#64748b]">Income</span>
            </div>
            <p className="text-lg font-bold text-white tabular-nums">$6,800</p>
            <p className="text-xs text-[#10b981] mt-0.5">This month</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-xs text-[#64748b]">Expenses</span>
            </div>
            <p className="text-lg font-bold text-white tabular-nums">$2,140</p>
            <p className="text-xs text-red-400 mt-0.5">This month</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-[#64748b] text-xs">
            <Shield className="w-3.5 h-3.5 text-[#10b981]" />
            Bank-level security
          </div>
          <div className="flex items-center gap-1.5 text-[#64748b] text-xs">
            <Zap className="w-3.5 h-3.5 text-[#10b981]" />
            AI-powered
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Branding Panel */}
      <BrandingPanel />

      {/* Right: Form Panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12 min-h-screen">
        <div className="w-full sm:w-[420px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}