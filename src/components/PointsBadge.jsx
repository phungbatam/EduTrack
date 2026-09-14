import { isBonus } from '../utils/helpers.js'

export default function PointsBadge({ rule, className = '' }) {
  if (!rule) return null
  const p = Number(rule.points) || 0
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
        isBonus(rule) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      } ${className}`}
    >
      {isBonus(rule) ? '+' : '-'}
      {p}đ
    </span>
  )
}