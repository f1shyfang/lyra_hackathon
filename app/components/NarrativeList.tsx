'use client'

import { Narrative } from '@/types/ml'

type NarrativeListProps = {
  narratives: Narrative[]
  topOnly?: boolean
}

/**
 * Displays narrative signals.
 * 
 * IMPORTANT: Top 5 only, no expansion, ever.
 * Premium curation - implies depth without dumping data.
 */
export function NarrativeList({ narratives }: NarrativeListProps) {
  // Sort and take only top 5 (hard cap, no expansion)
  const visibleNarratives = [...narratives]
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 5)

  const formatNarrativeName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-3">
      {visibleNarratives.map((narrative, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
        >
          <span className="text-slate-300">{formatNarrativeName(narrative.name)}</span>
          <span className="text-purple-300 font-mono text-sm">
            {(narrative.prob * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
