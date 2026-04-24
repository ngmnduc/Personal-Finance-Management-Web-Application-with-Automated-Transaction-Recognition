import { useDashboardOverview } from "../../features/dashboard/api/dashboard.api"
import PageSkeleton from "../../components/shared/PageSkeleton"
import { TrendingUp, Activity, Home, ArrowRight } from "lucide-react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"

export default function DashboardPage() {
  const { data: overview, isLoading } = useDashboardOverview()

  if (isLoading) return <PageSkeleton />

  const totalBalance = overview?.totalBalance || 0
  const wallets = overview?.wallets || []

  // Hardcode data as requested
  const checkingBalance = wallets.filter(w => w.type === 'bank' || w.type === 'cash').reduce((acc, curr) => acc + Number(curr.currentBalance), 0)
  const savingsBalance = wallets.filter(w => w.type === 'e-wallet' || w.type === 'general').reduce((acc, curr) => acc + Number(curr.currentBalance), 0)
  
  // Actually the mockup has generic "Checking" and "Savings", we can just use total / 2, or just the calculated values, let's use calculated if >=0 else mock.
  const checkingValue = checkingBalance > 0 ? checkingBalance : 840.00
  const savingsValue = savingsBalance > 0 ? savingsBalance : 410.00

  return (
    <div className="p-8 text-slate-800 min-h-full max-w-[1400px] mx-auto bg-[#f0f4f8]">
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Top: Total Liquidity */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden bg-white p-0">
            <CardContent className="p-6 sm:p-8 lg:p-10 flex flex-col h-full relative z-10">
              <div className="absolute right-0 bottom-0 w-1/2 h-48 pointer-events-none opacity-40 text-[#10b981] z-0">
                <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,150 C100,50 200,100 400,20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">TOTAL LIQUIDITY</h3>
                 <span className="bg-[#10b981]/20 text-[#166534] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center">
                   +12.4% <span className="ml-[2px]">▲</span>
                 </span>
              </div>
              
              <h2 className="text-[2rem] sm:text-[2.8rem] lg:text-[3.5rem] xl:text-[4.5rem] font-bold tracking-tight text-[#0f1f3d] leading-none mb-6 lg:mb-12 relative z-10">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance)}
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mt-auto z-10 pt-6 lg:pt-8 border-t border-slate-100 relative gap-4">
                <div className="flex gap-6 sm:gap-12">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CHECKING</p>
                    <p className="text-xl font-bold text-[#0f1f3d]">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(checkingValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SAVINGS</p>
                    <p className="text-xl font-bold text-[#0f1f3d]">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(savingsValue)}
                    </p>
                  </div>
                </div>
                <Button variant="link" className="text-sm font-bold text-[#0f1f3d] flex items-center hover:underline group p-0 h-auto self-start sm:self-auto">
                  View Wallets <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Dynamics */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-[#fcfdff] p-0">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 lg:mb-8 gap-3">
                <div>
                  <h3 className="text-xl font-bold text-[#0f1f3d]">Cash Flow Dynamics</h3>
                  <p className="text-sm text-slate-500 mt-1">Trailing 30-day institutional activity</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest text-[#0f1f3d] bg-white rounded-full px-4 py-2 border border-slate-100 shadow-sm self-start sm:self-auto">
                  <span className="flex items-center before:content-[''] before:w-2 before:h-2 before:rounded-full before:bg-[#10b981] before:mr-2">Income</span>
                  <span className="flex items-center before:content-[''] before:w-2 before:h-2 before:rounded-full before:bg-[#b91c1c] before:mr-2">Expenses</span>
                </div>
              </div>
              
              <div className="h-64 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                Chart Placeholder
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card className="rounded-[2rem] shadow-sm border border-slate-100 mb-8 bg-white p-0">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8 gap-3">
                <h3 className="text-xl font-bold text-[#0f1f3d]">Recent Activity</h3>
                <Button variant="outline" size="sm" className="text-xs font-bold text-[#0f1f3d] flex items-center uppercase tracking-widest hover:bg-slate-50 border-slate-200">
                  Export Ledger <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </Button>
              </div>
              
              <div className="h-64 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                Table Placeholder
              </div>
              
              <div className="mt-6 flex justify-center border-t border-slate-100 pt-6">
                <Button variant="ghost" className="text-sm font-bold text-slate-500 hover:text-[#0f1f3d]">Show All Transactions</Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="w-full xl:w-[350px] flex flex-col gap-6">
          
          <Card className="rounded-[2rem] bg-[#0f1f3d] text-white flex flex-col shadow-lg relative overflow-hidden border-none p-0">
             <CardContent className="p-8">
               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-6 relative z-10">
                  <Activity size={18} className="text-[#34d399]" />
               </div>
               <h3 className="text-2xl font-bold mb-8 relative z-10">Monthly Velocity</h3>
               
               <div className="mb-2 flex items-center justify-between text-sm relative z-10">
                 <span className="text-slate-400">Budget Pacing</span>
                 <span className="font-bold">74%</span>
               </div>
               <div className="w-full bg-slate-800 rounded-full h-3 mb-8 relative z-10 overflow-hidden">
                 <div className="bg-gradient-to-r from-[#34d399] to-[#10b981] h-3 rounded-full" style={{ width: '74%' }}></div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 lg:gap-4 relative z-10">
                 <div className="bg-white/5 rounded-2xl p-3 lg:p-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SPENT</p>
                   <p className="text-lg lg:text-xl font-bold">$2,450</p>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-3 lg:p-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ALLOCATED</p>
                   <p className="text-lg lg:text-xl font-bold">$3,300</p>
                 </div>
               </div>
               
               <Button className="w-full bg-white text-[#0f1f3d] hover:bg-slate-100 rounded-xl font-bold py-6 mt-6 border-none text-sm transition-transform hover:scale-[1.02]">
                 Recalibrate Forecast
               </Button>
             </CardContent>
          </Card>

          <Card className="rounded-[2rem] shadow-sm border border-slate-100 bg-white p-0">
             <CardContent className="p-8">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">CAPITAL HEALTH</h3>
               
               <div className="flex flex-col gap-6">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 flex items-center justify-center">
                       <TrendingUp size={18} className="text-[#10b981]" />
                     </div>
                     <span className="font-bold text-[#0f1f3d] text-sm">Savings Ratio</span>
                   </div>
                   <span className="font-bold text-[#10b981]">32%</span>
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-600"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     </div>
                     <span className="font-bold text-[#0f1f3d] text-sm">Burn Rate</span>
                   </div>
                   <span className="font-bold text-red-600">$82/day</span>
                 </div>
               </div>
             </CardContent>
          </Card>
          
          <Card className="rounded-[2rem] border border-slate-200 bg-[#f1f5f9] p-0">
             <CardContent className="p-8">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UPCOMING MILESTONE</h3>
                 <Home size={16} className="text-[#0f1f3d]" />
               </div>
               
               <h4 className="text-xl font-bold text-[#0f1f3d] mb-6">Down Payment Goal</h4>
               
               <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                 <span>PROGRESS</span>
                 <span className="text-[#0f1f3d]">$42,000 / $60,000</span>
               </div>
               <div className="w-full bg-slate-300 rounded-full h-2 overflow-hidden">
                 <div className="bg-[#0f1f3d] h-2 rounded-full" style={{ width: '70%' }}></div>
               </div>
             </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}