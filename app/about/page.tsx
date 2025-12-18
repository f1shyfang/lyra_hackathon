export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05070D] via-[#0b1020] to-[#05070D] text-slate-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-slate-50">About Lyra</h1>
          
          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-cyan-300">What is Lyra?</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Lyra is a recruiting signal intelligence platform that analyzes LinkedIn posts before you publish them. 
                Using machine learning models trained on real recruiting data, Lyra predicts:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li><strong>Audience Composition</strong> - Which professional roles your post will attract</li>
                <li><strong>Recruiting Risk</strong> - Whether your post signals Helpful, Harmless, or Harmful recruiting patterns</li>
                <li><strong>Narrative Signals</strong> - Underlying themes like toxic culture, burnout, elitism, etc.</li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-cyan-300">How It Works</h2>
              <div className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-slate-200 mb-2">1. Role Composition Model</h3>
                  <p className="leading-relaxed">
                    Multi-label classifier predicting which professional roles (Software Engineer, Product Manager, etc.) 
                    will find your post relevant. Shows percentage distribution across all detected roles.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 mb-2">2. Risk Classification Model</h3>
                  <p className="leading-relaxed">
                    Three-class classifier (Helpful/Harmless/Harmful) that evaluates recruiting risk. 
                    Combines model predictions with rule-based checks on narrative flags.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 mb-2">3. Narrative Detection</h3>
                  <p className="leading-relaxed">
                    Multi-label classifier identifying underlying themes like toxic_culture, burnout, 
                    credibility_overclaim, culture_misalignment, and elitism.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-cyan-300">Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="font-semibold text-slate-200 mb-2">Single Draft Analysis</h3>
                  <p className="text-sm text-slate-400">
                    Analyze one post to see detailed role composition, risk assessment, and narrative signals.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="font-semibold text-slate-200 mb-2">A/B Testing</h3>
                  <p className="text-sm text-slate-400">
                    Compare two draft variations side-by-side with delta calculations for all metrics.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="font-semibold text-slate-200 mb-2">Contrast Mode</h3>
                  <p className="text-sm text-slate-400">
                    Visual scaling option to emphasize differences in probability distributions.
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="font-semibold text-slate-200 mb-2">Raw Model Outputs</h3>
                  <p className="text-sm text-slate-400">
                    No LLM wrappers or explanations - just clean, direct model predictions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-cyan-300">Technical Stack</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-300">
                <div>
                  <h3 className="font-semibold text-slate-200 mb-2">Frontend</h3>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• Next.js 16 (App Router)</li>
                    <li>• React 19</li>
                    <li>• TypeScript</li>
                    <li>• Tailwind CSS</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 mb-2">Backend</h3>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• FastAPI</li>
                    <li>• scikit-learn models</li>
                    <li>• TF-IDF vectorization</li>
                    <li>• Python 3.10+</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-cyan-300">Use Cases</h2>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span><strong>Recruiting Teams:</strong> Audit job posts and company content before publishing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span><strong>Hiring Managers:</strong> Test different framings of role descriptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span><strong>Content Strategists:</strong> Understand audience composition for LinkedIn posts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span><strong>Employer Brand Teams:</strong> Identify and mitigate harmful recruiting signals</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
