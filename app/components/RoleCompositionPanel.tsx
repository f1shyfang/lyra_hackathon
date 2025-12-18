'use client'

import { RoleDistributionItem } from '@/types/analyze'

type RoleCompositionPanelProps = {
  roles: RoleDistributionItem[]
}

export function RoleCompositionPanel({ roles }: RoleCompositionPanelProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-slate-100">
        Role Composition
      </h2>
      <p className="text-slate-400 mb-6">
        Who this post will attract:
      </p>
      
      <div className="space-y-4">
        {roles.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-200 font-medium">{item.role}</span>
              <span className="text-slate-300 font-semibold">{item.pct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
