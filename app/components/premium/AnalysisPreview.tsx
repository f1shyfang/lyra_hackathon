'use client'

import { useState } from 'react'

export function AnalysisPreview() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="relative w-full max-w-6xl mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/20 transition-all duration-500 hover:shadow-3xl hover:bg-white/[0.12]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Draft Preview</h3>
          </div>
          
          <div className="space-y-4 text-slate-200 leading-relaxed">
            <p>Excited to announce our team is growing!</p>
            <p className="bg-purple-500/20 px-3 py-1 rounded-lg inline-block border border-purple-500/30">
              We're tackling complex challenges in distributed systems
            </p>
            <p>Looking for engineers who love diving deep into open-source projects and optimising for performance.</p>
            <p className="bg-purple-500/20 px-3 py-1 rounded-lg inline-block border border-purple-500/30">
              If you're passionate about building resilient systems
            </p>
            <p>and contributing to the community, let's chat.</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-purple-500/10 transition-all duration-500 hover:shadow-3xl hover:bg-white/[0.07]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Signal Analysis</h3>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-slate-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56 * 0.88} ${2 * Math.PI * 56}`}
                    className="transition-all duration-1000"
                    style={{
                      strokeDashoffset: isHovered ? 0 : 20,
                    }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">88%</div>
                    <div className="text-xs text-slate-400">Overall</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Engineers</div>
              <div className="text-2xl font-semibold text-blue-400">82%</div>
              <div className="text-xs text-slate-500 mt-1">Drawn to technical detail</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Founders</div>
              <div className="text-2xl font-semibold text-purple-400">83%</div>
              <div className="text-xs text-slate-500 mt-1">Likes constraints & scale</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Risk Signal</div>
              <div className="text-2xl font-semibold text-amber-400">45%</div>
              <div className="text-xs text-slate-500 mt-1">Wants clearer trajectory</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Community</div>
              <div className="text-2xl font-semibold text-emerald-400">76%</div>
              <div className="text-xs text-slate-500 mt-1">Responds to purpose</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400 mb-3 uppercase tracking-wide">Key Phrase Reactions</div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-sm text-slate-300">optimising for performance</span>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-sm text-slate-300">distributed systems</span>
              <div className="w-12 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">building resilient systems</span>
              <div className="w-14 h-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
