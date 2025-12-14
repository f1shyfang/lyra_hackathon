'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tables } from '@/types/supabase'

type Draft = Tables<'drafts'>
type CouncilFeedback = Tables<'council_feedback'> & {
  ai_personas?: {
    id: string
    name: string | null
    system_prompt: string | null
  }
}

export default function SimulationResultsPage() {
  const params = useParams()
  const router = useRouter()
  const draftId = params.id as string

  const [draft, setDraft] = useState<Draft | null>(null)
  const [feedback, setFeedback] = useState<CouncilFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [draftId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/drafts/${draftId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch results')
      }

      setDraft(data.draft)
      setFeedback(data.feedback || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <style jsx>{`
          :root {
            --bg: #0b0f17;
            --stroke: rgba(255,255,255,.10);
            --stroke2: rgba(255,255,255,.08);
            --panel: rgba(255,255,255,.04);
            --panelHover: rgba(255,255,255,.06);
            --muted: rgba(255,255,255,.66);
            --muted2: rgba(255,255,255,.42);
            --accent: #6d5efc;
            --shadow: 0 18px 60px rgba(0,0,0,.55);
            --radius: 18px;
            --radiusSm: 14px;
          }
          .wrap {
            padding: 28px 28px 40px;
            min-height: 100vh;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
            background:
              radial-gradient(1200px 800px at 50% 10%, rgba(109,94,252,.20), transparent 55%),
              radial-gradient(900px 700px at 10% 90%, rgba(255,255,255,.06), transparent 60%),
              var(--bg);
            color: rgba(255,255,255,.92);
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
        <div className="wrap">
          <div className="muted">Loading results...</div>
        </div>
      </>
    )
  }

  if (error || !draft) {
    return (
      <>
        <style jsx>{`
          :root {
            --bg: #0b0f17;
            --stroke: rgba(255,255,255,.10);
            --stroke2: rgba(255,255,255,.08);
            --panel: rgba(255,255,255,.04);
            --panelHover: rgba(255,255,255,.06);
            --muted: rgba(255,255,255,.66);
            --muted2: rgba(255,255,255,.42);
            --accent: #6d5efc;
            --shadow: 0 18px 60px rgba(0,0,0,.55);
            --radius: 18px;
            --radiusSm: 14px;
          }
          .wrap {
            padding: 28px 28px 40px;
            min-height: 100vh;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
            background:
              radial-gradient(1200px 800px at 50% 10%, rgba(109,94,252,.20), transparent 55%),
              radial-gradient(900px 700px at 10% 90%, rgba(255,255,255,.06), transparent 60%),
              var(--bg);
            color: rgba(255,255,255,.92);
          }
          .shell { max-width: 1480px; margin: 0 auto; }
          .page {
            background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
            border: 1px solid var(--stroke);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            backdrop-filter: blur(10px);
            padding: 22px;
          }
          .error {
            color: rgba(239, 68, 68, 0.9);
            padding: 12px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 14px;
          }
        `}</style>
        <div className="wrap">
          <div className="shell">
            <div className="page">
              <div className="error">
                {error || 'Results not found'}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx>{`
        :root {
          --bg: #0b0f17;
          --stroke: rgba(255,255,255,.10);
          --stroke2: rgba(255,255,255,.08);
          --panel: rgba(255,255,255,.04);
          --panelHover: rgba(255,255,255,.06);
          --muted: rgba(255,255,255,.66);
          --muted2: rgba(255,255,255,.42);
          --accent: #6d5efc;
          --shadow: 0 18px 60px rgba(0,0,0,.55);
          --radius: 18px;
          --radiusSm: 14px;
        }
        .wrap {
          padding: 28px 28px 40px;
          min-height: 100vh;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          background:
            radial-gradient(1200px 800px at 50% 10%, rgba(109,94,252,.20), transparent 55%),
            radial-gradient(900px 700px at 10% 90%, rgba(255,255,255,.06), transparent 60%),
            var(--bg);
          color: rgba(255,255,255,.92);
        }
        .shell { max-width: 1480px; margin: 0 auto; }
        .page {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          backdrop-filter: blur(10px);
          padding: 22px;
        }
        .glass { background: transparent; border: none; border-radius: 0; box-shadow: none; backdrop-filter: none; padding: 0; }
        .panel {
          background: var(--panel);
          border: 1px solid var(--stroke2);
          border-radius: var(--radiusSm);
        }
        .muted { color: var(--muted); }
        .muted2 { color: var(--muted2); }
        .topbar { display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .logo {
          width: 36px; height: 36px; border-radius: 12px;
          display: grid; place-items: center;
          font-weight: 800;
        }
        .btn {
          height: 40px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.90);
          cursor: pointer;
          font-weight: 700;
          transition: background 120ms ease, filter 120ms ease;
        }
        .btn:hover { background: rgba(255,255,255,.06); }
        h1 { font-size: 22px; letter-spacing: .4px; margin-top: 18px; }
        .content {
          margin-top: 16px;
        }
        .section {
          margin-bottom: 20px;
        }
        .sectionTitle {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.55);
          margin-bottom: 10px;
        }
        .contentBox {
          padding: 14px;
          background: var(--panel);
          border: 1px solid var(--stroke2);
          border-radius: var(--radiusSm);
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 13px;
        }
        .images {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .image {
          width: 120px;
          height: 120px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          object-fit: cover;
        }
        .scores {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 10px;
        }
        .scoreCard {
          padding: 14px;
          background: var(--panel);
          border: 1px solid var(--stroke2);
          border-radius: var(--radiusSm);
          text-align: center;
        }
        .scoreLabel {
          font-size: 11px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.55);
          margin-bottom: 8px;
        }
        .scoreValue {
          font-size: 32px;
          font-weight: 800;
        }
        .scoreExcitement { color: rgba(34, 197, 94, 0.9); }
        .scoreCringe { color: rgba(239, 68, 68, 0.9); }
        .scoreQuality { color: var(--accent); }
        .feedbackList {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .feedbackCard {
          padding: 14px;
          background: var(--panel);
          border: 1px solid var(--stroke2);
          border-radius: var(--radiusSm);
        }
        .feedbackHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .feedbackName {
          font-size: 14px;
          font-weight: 700;
        }
        .feedbackScores {
          display: flex;
          gap: 12px;
          font-size: 12px;
        }
        .feedbackScore {
          padding: 4px 8px;
          border-radius: 8px;
          background: rgba(255,255,255,.06);
        }
        .feedbackScoreExcitement { color: rgba(34, 197, 94, 0.9); }
        .feedbackScoreCringe { color: rgba(239, 68, 68, 0.9); }
        .feedbackText {
          font-size: 13px;
          line-height: 1.6;
          color: var(--muted);
          margin-bottom: 10px;
        }
        .feedbackFix {
          margin-top: 10px;
          padding: 10px;
          background: rgba(109, 94, 252, 0.1);
          border: 1px solid rgba(109, 94, 252, 0.2);
          border-radius: 10px;
        }
        .feedbackFixLabel {
          font-size: 11px;
          font-weight: 700;
          color: rgba(109, 94, 252, 0.9);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: .1em;
        }
        .feedbackFixText {
          font-size: 12px;
          color: rgba(109, 94, 252, 0.8);
          line-height: 1.5;
        }
        @media (max-width: 980px) {
          .scores { grid-template-columns: 1fr; }
          .wrap { padding: 18px; }
        }
      `}</style>

      <div className="wrap">
        <div className="shell">
          <div className="page">
            <div className="glass">
              <div className="topbar">
                <div className="brand">
                  <div className="logo panel">◎</div>
                  <div className="muted" style={{ fontSize: '13px' }}>Simulation Results</div>
                </div>

                <button className="btn" onClick={() => router.push('/examples/simulation')}>
                  ← Back to Simulation
                </button>
              </div>

              <h1>RESULTS</h1>

              <div className="content">
                {/* Original Content */}
                <div className="section">
                  <div className="sectionTitle">ORIGINAL CONTENT</div>
                  <div className="contentBox">{draft.content || '(No content)'}</div>
                  
                  {/* Images */}
                  {draft.image_urls && (draft.image_urls as string[]).length > 0 && (
                    <div className="images">
                      {(draft.image_urls as string[]).map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Content image ${index + 1}`}
                          className="image"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality Scores */}
                {(draft.avg_excitement_score !== null || draft.avg_cringe_score !== null || draft.quality_score !== null) && (
                  <div className="section">
                    <div className="sectionTitle">QUALITY SCORES</div>
                    <div className="scores">
                      {draft.avg_excitement_score !== null && (
                        <div className="scoreCard">
                          <div className="scoreLabel">Excitement</div>
                          <div className="scoreValue scoreExcitement">{draft.avg_excitement_score}</div>
                        </div>
                      )}
                      {draft.avg_cringe_score !== null && (
                        <div className="scoreCard">
                          <div className="scoreLabel">Cringe</div>
                          <div className="scoreValue scoreCringe">{draft.avg_cringe_score}</div>
                        </div>
                      )}
                      {draft.quality_score !== null && (
                        <div className="scoreCard">
                          <div className="scoreLabel">Quality</div>
                          <div className="scoreValue scoreQuality">{draft.quality_score}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Persona Feedback */}
                {feedback.length > 0 && (
                  <div className="section">
                    <div className="sectionTitle">
                      AI COUNCIL FEEDBACK ({feedback.length} {feedback.length === 1 ? 'PERSONA' : 'PERSONAS'})
                    </div>
                    <div className="feedbackList">
                      {feedback.map((fb) => (
                        <div key={fb.id} className="feedbackCard">
                          <div className="feedbackHeader">
                            <div className="feedbackName">
                              {fb.ai_personas?.name || 'Unknown Persona'}
                            </div>
                            <div className="feedbackScores">
                              <span className="feedbackScore feedbackScoreExcitement">
                                Excitement: {fb.excitement_score}/100
                              </span>
                              <span className="feedbackScore feedbackScoreCringe">
                                Cringe: {fb.cringe_score}/100
                              </span>
                            </div>
                          </div>
                          <div className="feedbackText">{fb.critique}</div>
                          {fb.specific_fix && (
                            <div className="feedbackFix">
                              <div className="feedbackFixLabel">Suggested Fix</div>
                              <div className="feedbackFixText">{fb.specific_fix}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feedback.length === 0 && (
                  <div className="section">
                    <div className="muted2" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                      No feedback available yet. The simulation may still be processing.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
