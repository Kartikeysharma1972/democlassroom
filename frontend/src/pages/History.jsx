import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import OutputBox from '../components/OutputBox'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8001' : window.location.origin

const PAGE_SIZE = 30

// Values match the tool_name each generator already sends to /api/save-chat.
const TOOLS = [
  { value: '',                 label: 'All tools' },
  { value: 'lesson-plan',      label: 'Lesson Plan' },
  { value: 'worksheet',        label: 'Worksheet' },
  { value: 'class-activity',   label: 'Class Activity' },
  { value: 'question-paper',   label: 'Question Paper' },
  { value: 'vocabulary',       label: 'Vocabulary' },
  { value: 'comprehension',    label: 'Comprehension' },
]

const TOOL_LABEL = Object.fromEntries(TOOLS.map(t => [t.value, t.label]))

function formatWhen(value) {
  if (!value) return ''
  // SQLite hands back "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker, which
  // Safari refuses to parse and Chrome reads as local time. Spell it out.
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

export default function History() {
  const { teacherId, user } = useAuth()
  const [items, setItems]     = useState([])
  const [tool, setTool]       = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [openItem, setOpen]   = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (toolFilter, offset) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          tool_filter: toolFilter,
          limit: PAGE_SIZE,
          offset,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.detail || 'Could not load history')
      const chats = data.chats || []
      setItems(prev => (offset ? [...prev, ...chats] : chats))
      setHasMore(chats.length === PAGE_SIZE)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => { load(tool, 0) }, [load, tool])

  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div style={{ padding: '22px 26px', maxWidth: 1180, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
            History
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>
            {firstName ? `Everything ${firstName} has generated, newest first.` : 'Everything you have generated, newest first.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TOOLS.map(t => (
            <button key={t.value} onClick={() => { setOpen(null); setTool(t.value) }}
              style={{
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                fontSize: '0.76rem', fontWeight: 600,
                border: `1.5px solid ${tool === t.value ? '#1E88FF' : 'var(--border)'}`,
                background: tool === t.value ? '#1E88FF' : 'var(--surface-1, #fff)',
                color: tool === t.value ? '#fff' : 'var(--text-2)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 18, padding: '10px 14px', borderRadius: 10,
          background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', fontSize: '0.82rem',
        }}>
          {error}
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div style={{
          marginTop: 40, padding: '38px 20px', textAlign: 'center',
          border: '1.5px dashed var(--border)', borderRadius: 14, color: 'var(--text-3)',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>Nothing here yet</div>
          <div style={{ fontSize: '0.84rem' }}>
            Generate a lesson plan or a worksheet and it will show up here.
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {items.map(item => {
          const isOpen = openItem && openItem.id === item.id
          return (
            <div key={item.id} style={{
              border: `1.5px solid ${isOpen ? '#bfdbfe' : 'var(--border)'}`,
              borderRadius: 14, background: 'var(--surface-1, #fff)', overflow: 'hidden',
            }}>
              <button onClick={() => setOpen(isOpen ? null : item)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '13px 16px', border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.topic || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 3 }}>
                    {[TOOL_LABEL[item.tool_name] || item.tool_name, item.grade_level, item.subject]
                      .filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {formatWhen(item.created_at)}
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    color: 'var(--text-3)', flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
                  }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  {(item.content || item.response_content)
                    ? <OutputBox result={item.content || item.response_content} loading={false}
                        toolName={TOOL_LABEL[item.tool_name] || item.tool_name} />
                    : <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                        {item.preview || item.response_preview || 'This entry was saved before full copies were kept.'}
                      </div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {loading && (
        <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
          Loading...
        </div>
      )}

      {hasMore && !loading && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button onClick={() => load(tool, items.length)}
            style={{
              padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
              border: '1.5px solid var(--border)', background: 'var(--surface-1, #fff)',
              fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)',
            }}>
            Load older
          </button>
        </div>
      )}
    </div>
  )
}
