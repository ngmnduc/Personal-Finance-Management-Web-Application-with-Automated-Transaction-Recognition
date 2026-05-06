import React from 'react'

interface AmountDisplayProps {
  value: number | string
  className?: string
  /** Show color coding: green for income, red for expense */
  type?: 'income' | 'expense' | 'neutral'
  /** Currency, defaults to VND */
  currency?: string
}

/**
 * Shared component for rendering monetary amounts in VND.
 * Always use this — never reimplement Intl.NumberFormat elsewhere.
 */
export default function AmountDisplay({
  value,
  className = '',
  type = 'neutral',
  currency = 'VND',
}: AmountDisplayProps) {
  const numericValue = Number(value)

  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericValue)

  const colorClass =
    type === 'income'
      ? 'text-[#10b981]'
      : type === 'expense'
      ? 'text-red-500'
      : ''

  return (
    <span className={`${colorClass} ${className}`.trim()}>
      {formatted}
    </span>
  )
}
