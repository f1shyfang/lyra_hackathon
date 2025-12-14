'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tables } from '@/types/supabase'

type AIPersona = Tables<'ai_personas'>

interface PersonaDisplay {
  id: string
  title: string
  desc: string
  tags: string[]
  active: boolean
}

// Helper functions to map between HTML format and Supabase format
function parseSystemPrompt(systemPrompt: string | null): { desc: string; tags: string[] } {
  if (!systemPrompt) return { desc: '', tags: [] }
  
  const tagsMatch = systemPrompt.match(/Tags:\s*(.+)$/i)
  
  let desc = systemPrompt
  let tags: string[] = []
  
  if (tagsMatch) {
    tags = tagsMatch[1]
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    // Remove tags section from desc
    desc = systemPrompt.replace(/\n\nTags:.*$/i, '').trim()
  }
  
  // Also handle legacy format with "Description:" prefix for backwards compatibility
  if (desc.startsWith('Description:')) {
    desc = desc.replace(/^Description:\s*/i, '').trim()
  }
  
  return { desc, tags }
}

function supabaseToDisplay(persona: AIPersona): PersonaDisplay {
  const { desc, tags } = parseSystemPrompt(persona.system_prompt)
  return {
    id: persona.id,
    title: persona.name || 'Untitled persona',
    desc,
    tags,
    active: persona.active ?? true,
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default function SimulationPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [personas, setPersonas] = useState<PersonaDisplay[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPersonas()
  }, [])

  useEffect(() => {
    // Clean up object URLs when files change
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const fetchPersonas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) throw error
      const displayPersonas = (data || []).map(supabaseToDisplay)
      setPersonas(displayPersonas)
    } catch (err) {
      console.error('Failed to fetch personas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    const newFiles = [...files, ...picked]
    setFiles(newFiles)
    
    // Create preview URLs
    const newPreviews = picked.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
    
    // Reset input
    e.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    // Revoke the object URL
    URL.revokeObjectURL(imagePreviews[index])
    
    // Remove from arrays
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleSelectAll = () => {
    setSelected(new Set(personas.map(p => p.id)))
  }

  const handleClearAll = () => {
    setSelected(new Set())
  }

  const handleRun = () => {
    if (selected.size === 0) return

    const payload = {
      content: prompt || '',
      selectedPersonas: personas.filter(p => selected.has(p.id)),
      attachedImagesCount: files.length,
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem('simulation_request', JSON.stringify(payload))
    alert('Run queued! Stored in localStorage["simulation_request"].')
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
        .btnPrimary {
          background: var(--accent);
          border-color: rgba(255,255,255,.10);
        }
        .btnPrimary:hover { filter: brightness(1.07); }
        .disabled {
          opacity: .5;
          cursor: not-allowed;
          filter: grayscale(30%);
        }
        h1 { font-size: 22px; letter-spacing: .4px; margin-top: 18px; }
        .layout {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1.45fr .85fr;
          gap: 14px;
          align-items: stretch;
        }
        @media (max-width: 980px) {
          .layout { grid-template-columns: 1fr; }
          .wrap { padding: 18px; }
        }
        .box { padding: 14px; height: 100%; }
        .labelRow {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 11px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.55);
        }
        textarea {
          width: 100%;
          margin-top: 10px;
          min-height: 420px;
          height: 52vh;
          resize: vertical;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.92);
          padding: 12px;
          outline: none;
          font-size: 13px;
          line-height: 1.35;
        }
        textarea:focus {
          border-color: rgba(109,94,252,.55);
          box-shadow: 0 0 0 3px rgba(109,94,252,.18);
        }
        .attachRow {
          display: flex; align-items: center; gap: 12px; margin-top: 10px; flex-wrap: wrap;
        }
        .fileBtn {
          height: 40px;
          padding: 0 12px;
          display: inline-flex; align-items: center; gap: 10px;
          cursor: pointer;
        }
        .thumbs { display: flex; gap: 10px; flex-wrap: wrap; }
        .thumb {
          width: 54px; height: 70px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
          overflow: hidden;
          position: relative;
        }
        .thumb img { width: 100%; height: 100%; object-fit: cover; opacity: .92; }
        .thumb .x {
          position: absolute; top: 6px; right: 6px;
          width: 20px; height: 20px;
          border-radius: 10px;
          display: grid; place-items: center;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.35);
          font-weight: 800;
        }
        .reviewHead {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
        }
        .linkRow {
          font-size: 12px;
          display: flex; gap: 8px; align-items: center;
        }
        .linkRow button {
          border: none; background: none; cursor: pointer;
          color: rgba(255,255,255,.70);
          text-decoration: underline;
          padding: 0;
          font-size: 12px;
        }
        .linkRow button:hover { color: white; }
        .list {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: calc(52vh + 60px);
          min-height: 420px;
          overflow: auto;
          padding-right: 4px;
        }
        .row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .row:hover { background: var(--panelHover); }
        .row.selected {
          background: rgba(109,94,252,.14);
          border-color: rgba(109,94,252,.40);
        }
        .check {
          width: 20px; height: 20px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.18);
          display: grid; place-items: center;
          font-weight: 900;
        }
        .row.selected .check {
          border-color: rgba(109,94,252,.55);
        }
        .footer {
          margin-top: 12px;
          font-size: 12px;
          color: rgba(255,255,255,.62);
        }
      `}</style>

      <div className="wrap">
        <div className="shell">
          <div className="page">
            <div className="glass">
              <div className="topbar">
                <div className="brand">
                  <div className="logo panel">◎</div>
                  <div className="muted" style={{ fontSize: '13px' }}>Persona Simulator</div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button className="btn" onClick={() => router.push('/examples/ai-personas')}>
                    ← Back
                  </button>
                  <button
                    className={`btn btnPrimary ${selected.size === 0 ? 'disabled' : ''}`}
                    onClick={handleRun}
                    disabled={selected.size === 0}
                  >
                    Run simulation ({selected.size})
                  </button>
                </div>
              </div>

              <h1>SIMULATION</h1>

              <div className="layout">
                {/* Prompt */}
                <div className="panel box">
                  <div className="labelRow">
                    <div>PROMPT</div>
                    <div className="muted2" style={{ letterSpacing: 0, textTransform: 'none' }}>
                      Saved automatically
                    </div>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Paste text here..."
                  />

                  <div className="attachRow">
                    <label className="panel fileBtn" htmlFor="fileInput">
                      📎 <span className="muted">Attach media</span>
                    </label>
                    <input
                      id="fileInput"
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <div className="thumbs">
                      {imagePreviews.map((url, i) => (
                        <div key={i} className="thumb">
                          <img alt="" src={url} />
                          <div className="x" onClick={() => handleRemoveImage(i)} title="Remove">
                            ×
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reviewers */}
                <div className="panel box">
                  <div className="reviewHead">
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800 }}>Reviewers</div>
                      <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                        Select one or more reviewers to evaluate the same content.
                      </div>
                    </div>

                    <div className="linkRow">
                      <button onClick={handleSelectAll} type="button">Select all</button>
                      <span className="muted2">/</span>
                      <button onClick={handleClearAll} type="button">Clear</button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="list" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                      Loading...
                    </div>
                  ) : (
                    <div className="list">
                      {personas.map(p => {
                        const isSelected = selected.has(p.id)
                        return (
                          <div
                            key={p.id}
                            className={`row panel ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleToggleSelection(p.id)}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>
                              {escapeHtml(p.title)}
                            </div>
                            <div className="check">{isSelected ? '✓' : ''}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="footer">
                    Selected: <span>{selected.size}</span>{' '}
                    <span className="muted2">• with live updates</span>
                    <br />
                    <span className="muted2">
                      {selected.size > 0 ? 'Ready to run.' : 'Select at least 1 reviewer.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
