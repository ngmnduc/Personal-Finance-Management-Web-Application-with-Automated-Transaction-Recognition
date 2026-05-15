import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default:     'bg-[#0f1f3d] text-white',
  secondary:   'bg-slate-100 text-slate-600',
  destructive: 'bg-red-100 text-red-700',
  outline:     'border border-slate-300 text-slate-600',
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
