import React from 'react'
import { colors } from '../../../../theme'

interface MacroBarProps {
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  compact?: boolean
}

export function MacroBar({ calories, protein, carbs, fat, compact = false }: MacroBarProps) {
  return (
    <div className="flex items-center justify-between bg-card-elevated rounded-lg px-3 py-2 min-w-0">
      <MacroStat label="Cal" value={calories} unit="kcal" compact={compact} />
      <div className="w-px h-5 bg-divider flex-shrink-0" aria-hidden="true" />
      <MacroStat label="P" value={protein} unit="g" color={colors.macroProtein} compact={compact} />
      <div className="w-px h-5 bg-divider flex-shrink-0" aria-hidden="true" />
      <MacroStat label="C" value={carbs} unit="g" color={colors.macroCarbs} compact={compact} />
      <div className="w-px h-5 bg-divider flex-shrink-0" aria-hidden="true" />
      <MacroStat label="F" value={fat} unit="g" color={colors.macroFat} compact={compact} />
    </div>
  )
}

function MacroStat({
  label,
  value,
  unit,
  color,
  compact,
}: {
  label: string
  value: number | null | undefined
  unit: string
  color?: string
  compact: boolean
}) {
  return (
    <div className="text-center min-w-0 flex-1">
      <p className="text-xs text-text-tertiary leading-none mb-0.5">{label}</p>
      <p
        className={compact ? 'text-xs font-semibold' : 'text-sm font-semibold'}
        style={color ? { color } : { color: colors.text }}
      >
        {value != null ? `${Math.round(value)}${unit}` : '—'}
      </p>
    </div>
  )
}
