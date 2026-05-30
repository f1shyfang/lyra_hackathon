'use client'

import { RiskResult } from '@/types/analyze'

type RiskAssessmentPanelProps = {
  risk: RiskResult
}

export function RiskAssessmentPanel({ risk }: RiskAssessmentPanelProps) {
  const getRiskColor = (riskClass: string) => {
    switch (riskClass) {
      case 'Helpful':
        return 'from-green-500 to-emerald-500'
      case 'Harmless':
        return 'from-yellow-500 to-orange-500'
      case 'Harmful':
        return 'from-red-500 to-rose-500'
      default:
        return 'from-slate-500 to-slate-600'
    }
  }

  const getRiskBadgeColor = (riskClass: string) => {
    switch (riskClass) {
      case 'Helpful':
        return 'bg-green-500/20 border-green-500/50 text-green-300'
      case 'Harmless':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
      case 'Harmful':
        return 'bg-red-500/20 border-red-500/50 text-red-300'
      default:
        return 'bg-slate-500/20 border-slate-500/50 text-slate-300'
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-slate-100">
        Recruiting Risk Assessment
      </h2>
      
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-slate-400">Classification:</span>
          <span className={`px-4 py-2 rounded-full border font-semibold ${getRiskBadgeColor(risk.risk_class)}`}>
            {risk.risk_class}
          </span>
          <span className="text-slate-400 text-sm">
            ({risk.risk_level} confidence)
          </span>
        </div>
        
        <p className="text-slate-300 text-sm">
          {risk.primary_risk_reason}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Probability Distribution
        </h3>
        
        {Object.entries(risk.risk_probs).map(([label, prob]) => (
          <div key={label} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-200 font-medium">{label}</span>
              <span className="text-slate-300 font-semibold">
                {(prob * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getRiskColor(label)} rounded-full transition-all duration-500`}
                style={{ width: `${prob * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
