import { Check } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type QueueStatus = 'queued' | 'scanning' | 'ready' | 'error' | 'needs_review'

export interface QueueItem {
  id: string
  file: File
  previewUrl: string
  status: QueueStatus
  confirmed: boolean
  skipped: boolean
  result?: {
    extracted: import('../api/ocr.api').ExtractedData
    extracted_text: string
    suggested_category_id: string | null
    default_wallet_id: string | null
    error?: string
  }
}

// ─── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  QueueStatus,
  { label: string; className: string; animate?: boolean }
> = {
  queued: {
    label: 'Queued',
    className: 'bg-slate-100 text-slate-500',
  },
  scanning: {
    label: 'Scanning',
    className: 'bg-amber-50 text-amber-600',
    animate: true,
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-50 text-emerald-700',
  },
  error: {
    label: 'Error',
    className: 'bg-red-50 text-red-600',
  },
  needs_review: {
    label: 'Needs Review',
    className: 'bg-amber-50 text-amber-700',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ThumbnailItemProps {
  item: QueueItem
  isSelected: boolean
  onClick: () => void
}

export default function ThumbnailItem({ item, isSelected, onClick }: ThumbnailItemProps) {
  const config = STATUS_CONFIG[item.status]
  const amount = item.result?.extracted?.amount

  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 border
        ${item.skipped ? 'opacity-40' : ''}
        ${isSelected
          ? 'ring-2 ring-[#10b981] border-transparent shadow-md'
          : 'border-slate-200 hover:border-slate-400'
        }
      `}
    >
      {/* Thumbnail image */}
      <img
        src={item.previewUrl}
        alt={item.file.name}
        className="object-cover rounded-xl h-24 w-full"
      />

      {/* Confirmed checkmark — top left */}
      {item.confirmed && (
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
          <Check size={11} className="text-white" strokeWidth={3} />
        </div>
      )}

      {/* Status badge — top right */}
      {item.confirmed ? (
        <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
          Confirmed
        </span>
      ) : (
        <span
          className={`
            absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold
            ${config.className}
            ${config.animate ? 'animate-pulse' : ''}
          `}
        >
          {config.label}
        </span>
      )}

      {/* File info + amount */}
      <div className="px-2 pb-2 pt-1 bg-white">
        <p className="text-xs font-medium text-slate-700 truncate">{item.file.name}</p>
        {item.status === 'ready' && amount != null && (
          <p className="text-xs font-bold text-emerald-600 mt-0.5">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
          </p>
        )}
      </div>
    </div>
  )
}
