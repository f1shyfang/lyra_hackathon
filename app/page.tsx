import Link from 'next/link'
import { AnalysisPreview } from './components/premium/AnalysisPreview'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Brighter center glow for homepage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white mb-6 tracking-tight leading-tight">
            See who your words attract
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 font-light">
            Recruiting intelligence for LinkedIn posts.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/analyze"
              className="px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-slate-100 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30"
            >
              Analyze a draft
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 text-slate-300 rounded-full font-medium hover:bg-white/10 transition-all duration-200"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Preview Section */}
      <section className="relative py-20 px-4">
        <div className="relative">
          <AnalysisPreview />
        </div>
      </section>

      {/* What You Learn Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-16 text-center">
            What you learn
          </h2>
          
          <div className="space-y-8">
            <div className="group">
              <p className="text-xl text-slate-300 leading-relaxed">
                Whether engineers feel invited — or pushed away
              </p>
            </div>
            
            <div className="group">
              <p className="text-xl text-slate-300 leading-relaxed">
                If engagement is coming from the wrong audience
              </p>
            </div>
            
            <div className="group">
              <p className="text-xl text-slate-300 leading-relaxed">
                When high likes hide recruiting risk
              </p>
            </div>
            
            <div className="group">
              <p className="text-xl text-slate-300 leading-relaxed">
                Which phrases attract the roles you need
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-2xl text-slate-300 mb-8 font-light">
            Designed for teams that care who they attract.
          </p>
          
          <Link
            href="/analyze"
            className="inline-block px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-slate-100 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30"
          >
            Try Lydo
          </Link>
        </div>
      </section>
    </div>
  )
}

