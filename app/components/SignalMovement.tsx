'use client'

type SignalMovementProps = {
  deltas: Record<string, number>
  title: string
  isPercentage?: boolean
  maxVisible?: number
}

export function SignalMovement({ deltas, title, isPercentage = false, maxVisible = 5 }: SignalMovementProps) {
  const sortedEntries = Object.entries(deltas)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, maxVisible)

  const formatValue = (value: number) => {
    const absValue = Math.abs(value)
    if (isPercentage) {
      return `${(absValue * 100).toFixed(1)}%`
    }
    return absValue.toFixed(1)
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
      <h3 className="text-xl font-bold mb-6 text-white">{title}</h3>
      
      <div className="space-y-3">
        {sortedEntries.map(([key, value]) => {
          const isPositive = value > 0
          const isNegative = value < 0
          
          if (Math.abs(value) < 0.001) return null
          
          return (
            <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-slate-300 text-sm">{key}</span>
              <div className="flex items-center gap-2">
                {isPositive && (
                  <>
                    <span className="text-emerald-400 text-lg">↑</span>
                    <span className="text-emerald-400 font-medium">{formatValue(value)}</span>
                  </>
                )}
                {isNegative && (
                  <>
                    <span className="text-rose-400 text-lg">↓</span>
                    <span className="text-rose-400 font-medium">{formatValue(value)}</span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
