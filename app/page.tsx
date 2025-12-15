import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0c1628] to-[#0a0f1c] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 text-slate-50">
            Amplify
          </h1>
          <p className="text-2xl opacity-80 mb-8">
            AI-Powered LinkedIn Content Optimization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Analyzer Card */}
          <Link href="/sentiment-analyzer">
            <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform cursor-pointer group backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-sky-200 mb-3">
                PR Sentiment Analyzer
              </h2>
              <p className="text-slate-200/80 mb-4">
                Predict whether your LinkedIn post will generate positive or negative PR using AI-powered sentiment analysis.
              </p>
              <div className="flex items-center text-sky-200 font-semibold group-hover:translate-x-2 transition-transform">
                Try it now →
              </div>
            </div>
          </Link>

          {/* AI Personas Card */}
          <Link href="/examples/ai-personas">
            <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform cursor-pointer group backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-sky-200 mb-3">
                AI Personas
              </h2>
              <p className="text-slate-200/80 mb-4">
                Get AI-powered persona critiques and optimize your LinkedIn content with expert feedback.
              </p>
              <div className="flex items-center text-sky-200 font-semibold group-hover:translate-x-2 transition-transform">
                Explore →
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

