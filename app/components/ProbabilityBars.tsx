'use client'

type ProbabilityBarsProps = {
  probs: Record<string, number>
  contrastMode?: boolean
}

/**
 * Displays risk probability bars.
 * Post-processing has already applied harmless bias for flat distributions.
 */
export function ProbabilityBars({ probs, contrastMode = false }: ProbabilityBarsProps) {
  const getBarColor = (label: string) => {
    switch (label) {
      case 'Helpful':
        return 'from-emerald-500 to-green-400'
      case 'Harmless':
        return 'from-blue-500 to-cyan-400'
      case 'Harmful':
        return 'from-rose-500 to-red-400'
      default:
        return 'from-slate-500 to-slate-400'
    }
  }

  const getDisplayWidth = (prob: number) => {
    if (!contrastMode) return prob * 100
    return Math.sqrt(prob) * 100
  }

  // Order: Helpful, Harmless, Harmful (positive to negative)
  const orderedLabels = ['Helpful', 'Harmless', 'Harmful']
  const orderedEntries = orderedLabels
    .filter(label => label in probs)
    .map(label => [label, probs[label]] as [string, number])

  return (
    <div className="space-y-3">
      {orderedEntries.map(([label, prob]) => (
        <div key={label} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-medium">{label}</span>
            <span className="text-slate-300 font-semibold">
              {(prob * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getBarColor(label)} rounded-full transition-all duration-500`}
              style={{ width: `${getDisplayWidth(prob)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
