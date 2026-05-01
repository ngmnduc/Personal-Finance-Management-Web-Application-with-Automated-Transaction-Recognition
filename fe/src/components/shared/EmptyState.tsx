import { Landmark } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-5">
      {icon && (
        <div className="w-24 h-24 rounded-[2rem] bg-slate-100 flex items-center justify-center">
          {icon}
        </div>
      )}
      {!icon && (
        <div className="w-24 h-24 rounded-[2rem] bg-slate-100 flex items-center justify-center">
          <Landmark size={40} className="text-slate-400" />
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-xl font-bold text-[#0f1f3d]">{title}</p>
        {description && <p className="text-sm text-slate-400 mt-2">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
