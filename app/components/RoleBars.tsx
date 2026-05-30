'use client'

import { RoleComposition } from '@/types/ml'

type RoleBarsProps = {
  roles: RoleComposition[]
  contrastMode?: boolean
  maxVisible?: number
}

/**
 * Displays role composition bars.
 * 
 * IMPORTANT: Top 5 only, no expansion, ever.
 * Post-processing already limits to 5 roles with amplified variance.
 */
export function RoleBars({ roles, contrastMode = false, maxVisible = 5 }: RoleBarsProps) {
  // Sort and take only top N (default 5, never more)
  const visibleRoles = [...roles]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, Math.min(maxVisible, 5)) // Hard cap at 5

  const getDisplayWidth = (pct: number) => {
    if (!contrastMode) return pct
    return Math.sqrt(pct / 100) * 100
  }

  return (
    <div className="space-y-4">
      {visibleRoles.map((item, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-medium">{item.role}</span>
            <span className="text-slate-300 font-semibold">{item.pct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${getDisplayWidth(item.pct)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
