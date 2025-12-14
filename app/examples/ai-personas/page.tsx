'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
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

function buildSystemPrompt(desc: string, tags: string[]): string {
  const parts: string[] = []
  if (desc) parts.push(desc)
  if (tags.length > 0) parts.push(`Tags: ${tags.join(', ')}`)
  return parts.join('\n\n') || ''
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

function displayToSupabase(display: PersonaDisplay): Partial<AIPersona> {
  return {
    name: display.title,
    system_prompt: buildSystemPrompt(display.desc, display.tags),
    active: display.active,
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

function iconFor(p: PersonaDisplay): string {
  const isDraft = (p.title || '').toLowerCase().includes('draft')
  if (isDraft) return '◦'
  const map = ['∙', '◊', '◇', '•', '∘']
  const i = (p.title.length + p.id.length) % map.length
  return map[i]
}

export default function AIPersonasPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [personas, setPersonas] = useState<PersonaDisplay[]>([])
  const [filtered, setFiltered] = useState<PersonaDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')
  const [editingTags, setEditingTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const filterWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPersonas()
  }, [])

  useEffect(() => {
    applyFilter()
  }, [personas, searchQuery, selectedTags])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterWrapRef.current && !filterWrapRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false)
      }
      if (!(event.target as HTMLElement).closest('.menu') && !(event.target as HTMLElement).closest('.dots')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchPersonas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
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

  const applyFilter = () => {
    let base = personas

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      base = base.filter(p => {
        const t = (p.title || '').toLowerCase()
        const d = (p.desc || '').toLowerCase()
        const tags = (p.tags || []).some(tag => String(tag).toLowerCase().includes(q))
        return t.includes(q) || d.includes(q) || tags
      })
    }

    if (selectedTags.size > 0) {
      base = base.filter(p => {
        const set = new Set((p.tags || []).map(x => String(x)))
        for (const tag of selectedTags) {
          if (!set.has(tag)) return false
        }
        return true
      })
    }

    setFiltered(base)
  }

  const getAllTags = (): string[] => {
    const set = new Set<string>()
    personas.forEach(p => (p.tags || []).forEach(t => {
      const v = String(t || '').trim()
      if (v) set.add(v)
    }))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }

  const handleAddPersona = () => {
    // Use a temporary ID that will be replaced when saved
    const tempId = 'temp-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    setEditingId(tempId)
    setEditingTitle('Draft persona')
    setEditingDesc('')
    setEditingTags([])
  }

  const handleSave = async () => {
    if (!editingId) return

    try {
      const displayData: PersonaDisplay = {
        id: editingId,
        title: editingTitle.trim() || 'Untitled persona',
        desc: editingDesc,
        tags: editingTags,
        active: true,
      }

      const supabaseData = displayToSupabase(displayData)

      // Check if persona exists (skip check if it's a temp ID)
      const isTempId = editingId.startsWith('temp-')
      const existing = !isTempId ? personas.find(p => p.id === editingId) : null
      
      if (existing) {
        // Update
        const { error, data } = await supabase
          .from('ai_personas')
          .update(supabaseData)
          .eq('id', editingId)
          .select()
        
        if (error) {
          console.error('Update error:', error)
          throw new Error(error.message || 'Failed to update persona')
        }
      } else {
        // Create - let Supabase generate the ID
        const { error, data } = await supabase
          .from('ai_personas')
          .insert([supabaseData])
          .select()
        
        if (error) {
          console.error('Insert error:', error)
          console.error('Data being inserted:', supabaseData)
          throw new Error(error.message || 'Failed to create persona')
        }
        
        // Update editingId with the generated ID if we got one
        if (data && data[0]?.id) {
          // The ID is now set, but we'll refresh the list anyway
        }
      }

      setEditingId(null)
      await fetchPersonas()
    } catch (err) {
      console.error('Failed to save persona:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save persona'
      alert(`Failed to save persona: ${errorMessage}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this persona?')) return

    try {
      const { error } = await supabase
        .from('ai_personas')
        .delete()
        .eq('id', id)
      if (error) throw error

      // Clean up selected tags
      const remainingTags = new Set(getAllTags())
      const newSelected = new Set(selectedTags)
      for (const tag of Array.from(selectedTags)) {
        if (!remainingTags.has(tag)) newSelected.delete(tag)
      }
      setSelectedTags(newSelected)

      await fetchPersonas()
    } catch (err) {
      console.error('Failed to delete persona:', err)
      alert('Failed to delete persona')
    }
  }

  const handleDuplicate = async (id: string) => {
    const persona = personas.find(p => p.id === id)
    if (!persona) return

    const newPersona: PersonaDisplay = {
      id: '', // Will be generated by Supabase
      title: persona.title + ' (copy)',
      desc: persona.desc,
      tags: [...persona.tags],
      active: persona.active,
    }

    try {
      const supabaseData = displayToSupabase(newPersona)
      // Don't pass id - let Supabase generate it
      const { error } = await supabase
        .from('ai_personas')
        .insert([supabaseData])
        .select()
      
      if (error) {
        console.error('Duplicate error:', error)
        throw new Error(error.message || 'Failed to duplicate persona')
      }
      
      await fetchPersonas()
    } catch (err) {
      console.error('Failed to duplicate persona:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate persona'
      alert(`Failed to duplicate persona: ${errorMessage}`)
    }
  }

  const handleEdit = (id: string) => {
    const persona = personas.find(p => p.id === id)
    if (!persona) return
    setEditingId(id)
    setEditingTitle(persona.title)
    setEditingDesc(persona.desc)
    setEditingTags([...persona.tags])
    setOpenMenuId(null)
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const v = tagInput.trim()
    if (!v) return
    if (!editingTags.some(t => t.toLowerCase() === v.toLowerCase())) {
      setEditingTags([...editingTags, v])
    }
    setTagInput('')
  }

  const handleRemoveTag = (idx: number) => {
    setEditingTags(editingTags.filter((_, i) => i !== idx))
  }

  const renderChips = (tags: string[]) => {
    const safe = tags.map(t => String(t).trim()).filter(Boolean)
    if (!safe.length) return null

    const maxShow = 4
    const shown = safe.slice(0, maxShow)
    const extra = safe.length - shown.length

    return (
      <div className="chips">
        {shown.map((t, i) => (
          <span key={i} className="chip">{escapeHtml(t)}</span>
        ))}
        {extra > 0 && <span className="chip chipMore">+{extra}</span>}
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
      `}</style>
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
        .header {
          margin-top: 18px;
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px;
        }
        h1 { font-size: 22px; letter-spacing: .4px; }
        .toolbar {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap; justify-content: flex-end;
        }
        .search {
          height: 40px; width: 260px;
          display: flex; align-items: center; gap: 10px;
          padding: 0 12px;
        }
        .search input {
          background: transparent; border: none; outline: none; color: rgba(255,255,255,.92);
          width: 100%;
          font-size: 13px;
        }
        .search input::placeholder { color: rgba(255,255,255,.35); }
        .toolbtn {
          height: 40px;
          padding: 0 12px;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          font-size: 13px;
          color: rgba(255,255,255,.86);
          transition: background 120ms ease, border-color 120ms ease, filter 120ms ease;
        }
        .toolbtn:hover { background: rgba(255,255,255,.06); }
        .primary {
          height: 40px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: var(--accent);
          color: white;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(0,0,0,.35);
          transition: filter 120ms ease;
        }
        .primary:hover { filter: brightness(1.07); }
        .runGhost {
          background: rgba(255,255,255,.16) !important;
          border-color: rgba(255,255,255,.28) !important;
          color: rgba(255,255,255,.96) !important;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.08),
            0 8px 20px rgba(0,0,0,.25);
        }
        .runGhost:hover {
          background: rgba(255,255,255,.22) !important;
          border-color: rgba(255,255,255,.36) !important;
        }
        .grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 980px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 680px) {
          .wrap { padding: 18px; }
          .grid { grid-template-columns: 1fr; }
          .search { width: 100%; }
        }
        .card {
          min-height: 170px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: background 120ms ease;
          position: relative;
          overflow: visible;
          gap: 10px;
        }
        .card:hover { background: var(--panelHover); }
        .cardTop { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .avatar {
          width: 32px; height: 32px; border-radius: 12px;
          display: grid; place-items: center;
          font-size: 13px;
        }
        .dots {
          width: 32px; height: 32px; border-radius: 12px;
          display: grid; place-items: center;
          cursor: pointer;
          transition: background 120ms ease;
          color: rgba(255,255,255,.7);
        }
        .dots:hover { background: rgba(255,255,255,.06); }
        .title {
          font-size: 14px;
          font-weight: 800;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .descPreview {
          font-size: 12px;
          color: rgba(255,255,255,.62);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 32px;
          margin-top: 8px;
        }
        .badge {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-height: 52px;
          overflow: hidden;
        }
        .chip {
          font-size: 11px;
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.78);
        }
        .chipMore { opacity: .65; }
        .menu {
          position: absolute;
          top: 46px;
          right: 10px;
          width: 200px;
          padding: 8px;
          border-radius: 14px;
          background: rgba(18,22,32,.96);
          border: 1px solid rgba(255,255,255,.10);
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
          display: none;
          z-index: 80;
        }
        .menu.open { display: block; }
        .menu button {
          width: 100%;
          padding: 12px 12px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          color: rgba(255,255,255,.88);
          font-size: 13px;
        }
        .menu button:hover { background: rgba(255,255,255,.06); }
        .danger { color: #ff8a8a; }
        .filterWrap { position: relative; }
        .filterMenu {
          position: absolute;
          top: 46px;
          right: 0;
          width: 280px;
          padding: 10px;
          border-radius: 14px;
          background: rgba(18,22,32,.96);
          border: 1px solid rgba(255,255,255,.10);
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
          display: none;
          z-index: 90;
        }
        .filterMenu.open { display: block; }
        .filterMenuHeader {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .filterTitle {
          font-size: 12px;
          font-weight: 800;
          color: rgba(255,255,255,.86);
          letter-spacing: .2px;
        }
        .filterClear {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 12px;
          color: rgba(255,255,255,.60);
          padding: 6px 8px;
          border-radius: 10px;
        }
        .filterClear:hover { background: rgba(255,255,255,.06); }
        .tagList {
          max-height: 220px;
          overflow: auto;
          padding-right: 4px;
        }
        .tagRow {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 8px;
          border-radius: 12px;
          cursor: pointer;
          user-select: none;
        }
        .tagRow:hover { background: rgba(255,255,255,.06); }
        .tagRow input { transform: translateY(1px); }
        .tagRow span {
          font-size: 12px;
          color: rgba(255,255,255,.82);
        }
        .tagEmpty {
          font-size: 12px;
          color: rgba(255,255,255,.55);
          padding: 10px 8px;
        }
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.55);
          display: none;
          align-items: center; justify-content: center;
          padding: 18px;
          z-index: 110;
        }
        .backdrop.open { display: flex; }
        .modal {
          width: min(640px, 100%);
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(18,22,32,.94);
          box-shadow: 0 18px 70px rgba(0,0,0,.75);
          padding: 16px;
        }
        .modalHeader {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          padding: 6px 4px 10px;
        }
        .modalTitle {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: .2px;
        }
        .close {
          width: 34px; height: 34px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          cursor: pointer;
        }
        .close:hover { background: rgba(255,255,255,.06); }
        .form {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          padding: 8px 4px;
        }
        label { font-size: 12px; color: rgba(255,255,255,.70); }
        .input, .textarea {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.92);
          padding: 10px 12px;
          outline: none;
          font-size: 13px;
        }
        .textarea { min-height: 96px; resize: vertical; line-height: 1.35; }
        .input:focus, .textarea:focus {
          border-color: rgba(109,94,252,.55);
          box-shadow: 0 0 0 3px rgba(109,94,252,.18);
        }
        .tagsRow { display: flex; gap: 10px; align-items: center; }
        .tagsRow input { flex: 1; }
        .tags {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-top: 8px;
        }
        .tag {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          font-size: 12px;
          color: rgba(255,255,255,.86);
        }
        .tag .x {
          width: 18px; height: 18px; border-radius: 999px;
          display: grid; place-items: center;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(0,0,0,.18);
          cursor: pointer;
          user-select: none;
          line-height: 1;
        }
        .tag .x:hover { background: rgba(255,255,255,.06); }
        .modalActions {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 10px 4px 4px;
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
        }
        .btn:hover { background: rgba(255,255,255,.06); }
        .btnPrimary {
          background: var(--accent);
          border-color: rgba(255,255,255,.10);
        }
        .btnPrimary:hover { filter: brightness(1.07); }
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
              </div>

              <div className="header">
                <div>
                  <h1>PERSONAS</h1>
                  <div className="muted" style={{ fontSize: '13px', marginTop: '6px' }}>
                    Create and manage reviewer profiles for simulations.
                  </div>
                </div>

                <div className="toolbar">
                  <div className="search panel">
                    <span className="muted2">🔎</span>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search (title, desc, tag)"
                    />
                  </div>

                  <div className="filterWrap" ref={filterWrapRef}>
                    <button
                      className="toolbtn panel"
                      onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                      type="button"
                    >
                      <span className="muted2">⏷</span>
                      <span className="muted">Filter</span>
                      {selectedTags.size > 0 && (
                        <span className="muted2" style={{ marginLeft: '6px', fontSize: '12px' }}>
                          ({selectedTags.size})
                        </span>
                      )}
                    </button>

                    <div className={`filterMenu ${filterMenuOpen ? 'open' : ''}`} ref={filterMenuRef}>
                      <div className="filterMenuHeader">
                        <div className="filterTitle">Filter by tag</div>
                        <button
                          className="filterClear"
                          onClick={() => {
                            setSelectedTags(new Set())
                            setFilterMenuOpen(false)
                          }}
                          type="button"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="tagList">
                        {getAllTags().length === 0 ? (
                          <div className="tagEmpty">No tags yet. Add tags in "Edit persona".</div>
                        ) : (
                          getAllTags().map(tag => (
                            <div
                              key={tag}
                              className="tagRow"
                              onClick={() => {
                                const newSelected = new Set(selectedTags)
                                if (newSelected.has(tag)) {
                                  newSelected.delete(tag)
                                } else {
                                  newSelected.add(tag)
                                }
                                setSelectedTags(newSelected)
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.has(tag)}
                                readOnly
                              />
                              <span>{escapeHtml(tag)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <button className="primary" onClick={handleAddPersona} type="button">
                    + New persona
                  </button>

                  <button
                    className="toolbtn panel runGhost"
                    onClick={() => router.push('/examples/simulation')}
                    type="button"
                    title="Go to simulation"
                  >
                    Run
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ marginTop: '16px', color: 'var(--muted)' }}>Loading...</div>
              ) : (
                <div className="grid">
                  {filtered.map(p => {
                    const isDraft = (p.title || '').toLowerCase().includes('draft')
                    const desc = (p.desc || '').trim()
                    return (
                      <div key={p.id} className="card panel">
                        <div className="cardTop">
                          <div className="avatar panel">{iconFor(p)}</div>
                          <div style={{ position: 'relative' }}>
                            <button
                              className="dots panel"
                              onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                              type="button"
                              aria-label="Open menu"
                            >
                              ⋯
                            </button>
                            {openMenuId === p.id && (
                              <div className="menu open">
                                <button type="button" onClick={() => handleEdit(p.id)}>
                                  <span className="muted">Edit</span>
                                </button>
                                <button type="button" onClick={() => handleDuplicate(p.id)}>
                                  <span className="muted">Duplicate</span>
                                </button>
                                <button type="button" onClick={() => handleDelete(p.id)}>
                                  <span className="danger">Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div className="title">{escapeHtml(p.title)}</div>
                            {isDraft && <span className="badge panel muted">Draft</span>}
                          </div>
                          <div className="descPreview">
                            {desc ? escapeHtml(desc) : <span className="muted2">No description yet.</span>}
                          </div>
                        </div>

                        <div>{renderChips(p.tags)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div
          className={`backdrop ${editingId ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingId(null)
            }
          }}
        >
          <div className="modal">
            <div className="modalHeader">
              <div>
                <div className="modalTitle">Edit persona</div>
                <div className="muted2" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Title, description, tags.
                </div>
              </div>
              <button
                className="close"
                onClick={() => setEditingId(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="form">
              <div>
                <label>Title</label>
                <input
                  className="input"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Untitled persona"
                />
              </div>

              <div>
                <label>Description</label>
                <textarea
                  className="textarea"
                  value={editingDesc}
                  onChange={(e) => setEditingDesc(e.target.value)}
                  placeholder="What is this persona like?"
                />
              </div>

              <div>
                <label>Tags</label>
                <div className="tagsRow">
                  <input
                    className="input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add a tag and press Enter"
                  />
                </div>
                <div className="tags">
                  {editingTags.map((t, idx) => (
                    <span key={idx} className="tag">
                      {escapeHtml(t)}{' '}
                      <span className="x" onClick={() => handleRemoveTag(idx)} title="Remove">
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="modalActions">
              <button className="btn" onClick={() => setEditingId(null)} type="button">
                Cancel
              </button>
              <button className="btn btnPrimary" onClick={handleSave} type="button">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
