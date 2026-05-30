'use client'

type DiffTableProps = {
  deltas: Record<string, number>
  title: string
  isPercentage?: boolean
}

export function DiffTable({ deltas, title, isPercentage = true }: DiffTableProps) {
  const sortedDeltas = Object.entries(deltas).sort(
    ([, a], [, b]) => Math.abs(b) - Math.abs(a)
  )

  const formatValue = (value: number) => {
    const formatted = isPercentage ? (value * 100).toFixed(1) : value.toFixed(1)
    return value > 0 ? `+${formatted}` : formatted
  }

  const getDeltaColor = (value: number) => {
    if (Math.abs(value) < 0.001) return 'text-slate-500'
    return value > 0 ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">{title}</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedDeltas.map(([key, value]) => (
          <div
            key={key}
            className="flex justify-between items-center py-2 border-b border-white/5"
          >
            <span className="text-slate-300 text-sm">
              {key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </span>
            <span className={`font-mono text-sm font-semibold ${getDeltaColor(value)}`}>
              {formatValue(value)}{isPercentage ? '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
