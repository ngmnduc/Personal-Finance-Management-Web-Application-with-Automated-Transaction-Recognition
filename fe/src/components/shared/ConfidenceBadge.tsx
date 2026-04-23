interface ConfidenceBadgeProps {
  score: number
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const config =
    score > 0.85
      ? {
          label: 'High Confidence',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        }
      : score >= 0.6
        ? {
            label: 'Medium Confidence',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-400',
          }
        : {
            label: 'Low Confidence',
            className: 'bg-red-50 text-red-600 border-red-200',
            dot: 'bg-red-400',
          }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
      <span className="opacity-60 font-normal">({Math.round(score * 100)}%)</span>
    </span>
  )
}
