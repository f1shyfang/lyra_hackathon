export function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          <div className="h-4 bg-slate-700/50 rounded w-full" />
          <div className="h-4 bg-slate-700/50 rounded w-5/6" />
          <div className="h-4 bg-slate-700/50 rounded w-4/6" />
        </div>
      </div>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          <div className="h-4 bg-slate-700/50 rounded w-full" />
          <div className="h-4 bg-slate-700/50 rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}
