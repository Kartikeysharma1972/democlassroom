import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import UsageCounter from '../components/UsageCounter'
import { RichTextToolbar } from '../components/OutputBox'
import { useAuth } from '../context/AuthContext'
import { GRADES, GRADE_OPTIONS, getCoreSubjects, getMiscSubjects, getCoreTopics, getMiscTopics, findTopicDescription } from '../data/cbseSubjects'
import { LANGUAGES } from '../data/languages'
import { htmlStringToPdf, escapeHtml } from '../utils/pdf'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8001' : window.location.origin
const STORAGE_KEY = 'classroom-qpaper-state'

// Wipe any persisted result so the tool always opens fresh - no previous
// session is restored. (The user wants a clean slate every time.)
try { localStorage.removeItem(STORAGE_KEY) } catch {}

/* ─── Reusable SelectDown ──────────────────────────── */
function SelectDown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const selected = options.find(o => (o.value ?? o) === value)
  const label = selected ? (selected.label ?? selected) : (placeholder || value)
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10,
          fontFamily: 'inherit', fontSize: '0.9rem', color: selected ? 'var(--text-1)' : 'var(--text-3)', background: 'var(--bg)',
          cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', outline: 'none' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10,
          maxHeight: 220, overflowY: 'auto', padding: '4px 0', margin: 0, listStyle: 'none',
          boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
          {options.map((opt) => {
            const v = opt.value ?? opt; const l = opt.label ?? opt; const active = v === value
            const disabled = !!opt.disabled
            return (
              <li key={v}
                onMouseDown={disabled ? undefined : () => { onChange(v); setOpen(false) }}
                style={{ padding: '9px 14px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                  color: disabled ? 'var(--text-3)' : (active ? 'var(--accent)' : 'var(--text-1)'),
                  background: active && !disabled ? 'var(--accent-soft)' : 'transparent',
                  fontWeight: active ? 600 : 400, opacity: disabled ? 0.55 : 1 }}>{l}</li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ─── Track Tabs ───────────────────────────────────── */
function TrackTabs({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      {[{ key: 'core', label: 'ICT', icon: '📘' }, { key: 'misc', label: 'Miscellaneous', icon: '🌍' }].map(t => (
        <button key={t.key} type="button" onClick={() => onChange(t.key)}
          style={{ flex: 1, padding: '10px 0', border: `1.5px solid ${value === t.key ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10, background: value === t.key ? 'var(--accent-soft)' : 'var(--bg)',
            color: value === t.key ? 'var(--accent)' : 'var(--text-2)', fontWeight: value === t.key ? 700 : 500,
            fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Pill Selector ────────────────────────────────── */
function PillSelector({ options, value, onChange, columns = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{ padding: '10px 8px', border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, background: active ? 'var(--accent-soft)' : 'var(--bg)',
              color: active ? 'var(--accent)' : 'var(--text-2)', fontWeight: active ? 700 : 500,
              fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
            <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
            <span>{opt.label}</span>
            {opt.desc && <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>{opt.desc}</span>}
          </button>
        )
      })}
    </div>
  )
}

const Label = ({ children }) => (
  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>{children}</label>
)

/* ─── PDF Generation ───────────────────────────────── */
// mode: 'full' (question paper + answer key) | 'questions' (paper only) | 'answers' (answer key only)
// Built as HTML and snapshotted to PDF so EVERY output language (Hindi, Tamil,
// Urdu, …) renders correctly - jsPDF's text fonts only cover Latin scripts.
async function downloadPaperPDF(data, grade, subject, difficulty, logoDataUrl, mode = 'full') {
  const showQuestions = mode === 'full' || mode === 'questions'
  const showAnswers   = mode === 'full' || mode === 'answers'
  const titleSuffix = mode === 'questions' ? ' (Question Paper)' : mode === 'answers' ? ' (Answer Key)' : ''
  const questions = data.questions || []
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0)
  const instructions = (data.instructions && data.instructions.length)
    ? data.instructions
    : ['Read all questions carefully.', 'Write neat and legible answers.', 'Marks are indicated on the right.']

  const headerLogo = logoDataUrl
    ? `<div style="text-align:center;margin-bottom:8px"><img src="${logoDataUrl}" style="height:54px;object-fit:contain"/></div>` : ''
  const watermark = logoDataUrl
    ? `<div style="position:absolute;inset:0;z-index:0;opacity:0.05;background-image:url('${logoDataUrl}');background-repeat:repeat;background-size:140px;background-position:center"></div>` : ''

  let body = ''
  if (showQuestions) {
    body += `<div style="margin:16px 0 6px;font-weight:700;font-size:15px;color:#222">General Instructions:</div>`
    body += `<ul style="margin:0 0 14px 0;padding-left:22px;color:#333;font-size:14px;line-height:1.7">`
      + instructions.map(i => `<li>${escapeHtml(i)}</li>`).join('') + `</ul>`

    let curSection = ''
    questions.forEach((q, i) => {
      if (q.section && q.section !== curSection) {
        curSection = q.section
        body += `<div style="margin:18px 0 8px;font-weight:800;font-size:16px;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px">${escapeHtml(q.section)}</div>`
      }
      body += `<div style="margin:12px 0 4px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start">`
        + `<div style="font-size:15px;color:#111;flex:1"><b>Q${i + 1}.</b> ${escapeHtml(q.question)}</div>`
        + (q.marks ? `<div style="font-size:13px;color:#777;white-space:nowrap">[${escapeHtml(q.marks)}]</div>` : '')
        + `</div>`
      if (q.type === 'mcq' && q.options) {
        body += `<div style="margin:2px 0 6px 20px">`
          + q.options.map((opt, j) => `<div style="font-size:14px;color:#33475b;margin:3px 0">(${['A','B','C','D'][j] || j + 1}) ${escapeHtml(String(opt).replace(/^[A-D]\)\s*/i, ''))}</div>`).join('')
          + `</div>`
      }
      if (q.type === 'subjective') {
        const lines = (q.marks || 1) <= 2 ? 3 : (q.marks || 1) <= 4 ? 5 : 8
        body += `<div style="margin:4px 0 8px 20px">`
          + Array.from({ length: lines }, () => `<div style="border-bottom:1px solid #cbd5e1;height:22px"></div>`).join('')
          + `</div>`
      }
    })
  }

  if (showAnswers) {
    if (showQuestions) body += `<div style="height:28px"></div>`
    body += `<div style="margin:18px 0 10px;text-align:center;font-weight:800;font-size:18px;color:#0b1b2d;border-top:2px solid #0b1b2d;padding-top:14px">ANSWER KEY</div>`
    questions.forEach((q, i) => {
      body += `<div style="margin:8px 0">`
        + `<div style="font-size:14px;color:#111"><b>Q${i + 1}.</b> ${q.type === 'mcq' ? escapeHtml(q.correct || '') : '(Subjective)'}</div>`
        + (q.explanation ? `<div style="font-size:13px;color:#555;margin-left:20px">${escapeHtml(q.explanation)}</div>` : '')
        + `</div>`
    })
  }

  const metaLine = `Grade: ${escapeHtml(grade)} &nbsp;|&nbsp; Subject: ${escapeHtml(subject)} &nbsp;|&nbsp; Difficulty: ${escapeHtml(difficulty)}`
  const marksLine = showQuestions
    ? `<div style="text-align:center;font-size:13px;color:#555;margin-top:3px">Total Marks: ${totalMarks} &nbsp;|&nbsp; Time: ${escapeHtml(data.duration || 'As instructed')}</div>` : ''

  const html =
    `<div style="position:relative">`
    + watermark
    + `<div style="position:relative;z-index:1">`
    + headerLogo
    + `<div style="text-align:center;font-weight:800;font-size:20px;color:#0b1b2d">${escapeHtml((data.title || 'Question Paper') + titleSuffix)}</div>`
    + `<div style="text-align:center;font-size:13px;color:#555;margin-top:4px">${metaLine}</div>`
    + marksLine
    + `<div style="border-bottom:1px solid #b8c2cc;margin:10px 0 2px"></div>`
    + body
    + `</div></div>`

  const fileSuffix = mode === 'questions' ? '-Questions' : mode === 'answers' ? '-Answer-Key' : ''
  const filename = `${(data.title || 'Question-Paper').replace(/\s+/g, '-')}${fileSuffix}.pdf`
  await htmlStringToPdf(html, filename)
}


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function QuestionPaperGenerator() {
  const { teacherId: TEACHER_ID } = useAuth()

  const [grade, setGrade]               = useState('Grade 10')
  const [subject, setSubject]           = useState('')
  const [topic, setTopic]               = useState('')
  const [subjectTrack, setSubjectTrack] = useState('core')
  const [difficulty, setDifficulty]     = useState('medium')
  const [numQ, setNumQ]                 = useState(10)
  const [questionCategory, setQuestionCategory] = useState('ncert')
  const [questionType, setQuestionType] = useState('mix')
  const [language, setLanguage]         = useState('English')
  const [schoolLogo, setSchoolLogo]     = useState(null)
  const [schoolLogoName, setSchoolLogoName] = useState('')

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [dlOpen, setDlOpen]     = useState(false)
  const dlRef                   = useRef(null)
  const usageCounterRef         = useRef(null)
  const [paper, setPaper]       = useState(null)
  const [mode, setMode]         = useState('setup') // setup | paper
  const [qpEditing, setQpEditing] = useState(false)
  const qpEditAreaRef = useRef(null)

  // Derived
  const coreSubjects = useMemo(() => getCoreSubjects(grade), [grade])
  const miscSubjects = useMemo(() => getMiscSubjects(grade), [grade])
  const subjectList = subjectTrack === 'core' ? coreSubjects : miscSubjects
  const coreTopics = useMemo(() => getCoreTopics(grade, subject), [grade, subject])
  const miscTopics = useMemo(() => getMiscTopics(grade, subject), [grade, subject])
  const topicList = subjectTrack === 'core' ? coreTopics : miscTopics

  useEffect(() => { setSubject(''); setTopic('') }, [grade, subjectTrack])
  useEffect(() => { setTopic('') }, [subject])


  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setSchoolLogoName(file.name)
    const reader = new FileReader(); reader.onload = (ev) => setSchoolLogo(ev.target.result); reader.readAsDataURL(file)
  }

  const generate = async () => {
    if (!subject.trim()) { setError('Please select a subject'); return }
    if (!topic.trim()) { setError('Please select or enter a topic'); return }
    setLoading(true); setError('')
    try {
      try {
        const u = await fetch(`${API}/api/increment-usage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacher_id: TEACHER_ID, tool_name: 'question-paper' }) })
        const ud = await u.json(); if (ud.exceeded) { setError(ud.error || 'Daily limit exceeded.'); setLoading(false); return }
      } catch {}

      const topicDesc = findTopicDescription(grade, subject, topic) || ''
      const res = await fetch(`${API}/api/quiz`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, grade_level: grade, subject, num_questions: numQ, difficulty, question_category: questionCategory, question_type: questionType, paper_mode: true, topic_description: topicDesc, topic_track: subjectTrack, language }),
      })
      if (!res.ok) {
        let errMsg = 'Failed to generate question paper'
        try { const errData = await res.json(); errMsg = errData.detail || errMsg } catch {}
        throw new Error(errMsg)
      }
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('AI returned an invalid response. Please try again.') }
      setPaper(data); setMode('paper')
      if (usageCounterRef.current) usageCounterRef.current.refresh()

      try { fetch(`${API}/api/save-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: TEACHER_ID, tool_name: 'question-paper', topic, grade_level: grade, subject,
          request_data: { topic, grade, subject, numQ, difficulty, questionCategory, questionType },
          response_preview: `Paper: ${data.title} - ${data.questions?.length} questions`,
          response_content: JSON.stringify(data) }) }) } catch {}
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── Edit helpers for question paper ──
  const updateQuestion = (idx, field, value) => {
    const updated = { ...paper, questions: paper.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q) }
    setPaper(updated)
  }
  const updateOption = (qIdx, optIdx, value) => {
    const updated = { ...paper, questions: paper.questions.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...q.options]; opts[optIdx] = value
      return { ...q, options: opts }
    })}
    setPaper(updated)
  }
  const updatePaperTitle = (value) => setPaper({ ...paper, title: value })
  const deleteQuestion = (idx) => {
    const updated = { ...paper, questions: paper.questions.filter((_, i) => i !== idx) }
    setPaper(updated)
  }

  const handleDownloadPDF = (downloadMode = 'full') => {
    if (!paper) return
    setDlOpen(false); setPdfLoading(true)
    downloadPaperPDF(paper, grade, subject, difficulty, schoolLogo, downloadMode)
      .catch(e => { console.error('PDF generation failed:', e); setError('Could not generate PDF. Please try again.') })
      .finally(() => setPdfLoading(false))
  }

  useEffect(() => {
    if (!dlOpen) return
    const h = (e) => { if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dlOpen])


  /* ═══ SETUP SCREEN ═══ */
  if (mode === 'setup') return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <h1 style={{ flex: 1, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/codevidhya_logo.jfif" alt="CodeVidhya"
            style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', padding: 3, border: '1.5px solid #B6D9FF', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display='none' }} />
          Question Paper Generator
          <UsageCounter ref={usageCounterRef} teacherId={TEACHER_ID} toolName="question-paper" />
        </h1>
      </div>
      <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: 28 }}>
        Generate question papers with proper sections, marks, and answer keys
      </p>

      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div><Label>Source Track</Label><TrackTabs value={subjectTrack} onChange={setSubjectTrack} /></div>

        <div><Label>Grade Level *</Label><SelectDown value={grade} onChange={setGrade} options={GRADE_OPTIONS} /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Label>Subject *</Label>
            {subjectList.length > 0 && (
              <SelectDown
                value={subjectList.includes(subject) ? subject : ''}
                onChange={setSubject}
                options={subjectList}
                placeholder="Select subject"
              />
            )}
            <input
              value={subjectList.includes(subject) ? '' : subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={subjectList.length ? 'Or type your own subject…' : 'Type subject (e.g. Artificial Intelligence)'}
              style={{ marginTop: subjectList.length ? 8 : 0, width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-1)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <Label>Topic *</Label>
            {topicList.length > 0 && (
              <SelectDown
                value={topicList.some(t => (typeof t === 'string' ? t : (t.label || t.topic)) === topic) ? topic : ''}
                onChange={setTopic}
                options={topicList.map(t => typeof t === 'string' ? t : { value: t.label || t.topic, label: (t.chapter ? `${t.chapter} - ` : '') + (t.label || t.topic) })}
                placeholder="Select topic"
              />
            )}
            <input
              value={topicList.some(t => (typeof t === 'string' ? t : (t.label || t.topic)) === topic) ? '' : topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={topicList.length ? 'Or type your own topic…' : 'Type topic…'}
              style={{ marginTop: topicList.length ? 8 : 0, width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-1)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><Label>Difficulty</Label><SelectDown value={difficulty} onChange={setDifficulty} options={[{ value: 'easy', label: '🟢 Easy' }, { value: 'medium', label: '🟡 Medium' }, { value: 'hard', label: '🔴 Hard' }]} /></div>
          <div><Label>Number of Questions</Label><SelectDown value={numQ} onChange={v => setNumQ(Number(v))} options={[5,8,10,15,20,25,30].map(n => ({ value: n, label: `${n} questions` }))} /></div>
        </div>

        <div><Label>Output Language</Label>
          <SelectDown value={language} onChange={setLanguage} options={LANGUAGES} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>Formulas, code & technical terms stay in English.</div>
        </div>

        <div><Label>Question Category</Label>
          <PillSelector value={questionCategory} onChange={setQuestionCategory} options={[
            { value: 'ncert', icon: '📗', label: 'Textbook Based', desc: 'Textbook-aligned' },
            { value: 'miscellaneous', icon: '🌐', label: 'Miscellaneous', desc: 'Broad knowledge' },
            { value: 'advanced', icon: '🚀', label: 'Advanced', desc: 'Competitive level' },
          ]} />
        </div>

        <div><Label>Question Type</Label>
          <PillSelector value={questionType} onChange={setQuestionType} options={[
            { value: 'mcq', icon: '🔘', label: 'MCQ', desc: 'Multiple choice' },
            { value: 'subjective', icon: '✍️', label: 'Subjective', desc: 'Descriptive' },
            { value: 'mix', icon: '🔀', label: 'Mix', desc: 'MCQ + Subjective' },
          ]} />
        </div>

        {/* Logo Upload */}
        <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1.5px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)', marginBottom: 4 }}>🏫 School Logo / Watermark</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>
              {schoolLogoName ? `✅ ${schoolLogoName}` : 'Upload your school logo (PNG/JPG) - appears as watermark on all pages'}
            </div>
          </div>
          <label style={{ padding: '8px 16px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1.5px solid var(--accent)', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {schoolLogo ? 'Change' : 'Upload'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} style={{ display: 'none' }} />
          </label>
          {schoolLogo && <img src={schoolLogo} alt="logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} />}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem' }}>⚠️ {error}</div>}

        <button onClick={generate} disabled={loading}
          style={{ padding: '14px', background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white', border: 'none', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(var(--accent-rgb),.3)' }}>
          {loading ? '⏳ Generating Question Paper…' : '📄 Generate Question Paper'}
        </button>
      </div>

    </div>
  )


  /* ═══ PAPER VIEW ═══ */
  if (mode === 'paper' && paper) {
    const totalMarks = (paper.questions || []).reduce((s, q) => s + (q.marks || 1), 0)
    const mcqCount = (paper.questions || []).filter(q => q.type === 'mcq').length
    const subjCount = (paper.questions || []).filter(q => q.type === 'subjective').length

    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: 1 }}>
            {qpEditing ? (
              <input value={paper.title} onChange={e => updatePaperTitle(e.target.value)}
                style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-1)', border: '1.5px solid #c4b5fd', borderRadius: 8, padding: '4px 10px', width: '100%', outline: 'none', background: '#faf5ff', fontFamily: 'inherit' }} />
            ) : (
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-1)' }}>{paper.title}</div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
              {grade} · {subject} · {difficulty} · {totalMarks} marks
              {mcqCount > 0 && ` · ${mcqCount} MCQ`}{subjCount > 0 && ` · ${subjCount} Subjective`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Edit toggle */}
            <button onClick={() => setQpEditing(e => !e)}
              style={{
                padding: '8px 18px', borderRadius: 10,
                border: qpEditing ? '1.5px solid #c4b5fd' : '1.5px solid #ddd6fe',
                background: qpEditing ? '#0E7CF0' : '#f5f3ff',
                color: qpEditing ? '#fff' : '#0E7CF0',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {qpEditing ? 'Done Editing' : 'Edit'}
            </button>

            <div style={{ position: 'relative' }} ref={dlRef}>
              <button onClick={() => setDlOpen(o => !o)} disabled={pdfLoading}
                style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid #fecaca', background: dlOpen ? '#fef2f2' : 'transparent', color: '#dc2626', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {pdfLoading
                  ? 'Preparing...'
                  : <>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download PDF
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ transform: dlOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </>}
              </button>
              {dlOpen && !pdfLoading && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 60, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, width: 264, overflow: 'hidden', boxShadow: '0 12px 32px rgba(15,23,42,0.16)' }}>
                  {[
                    { mode: 'questions', icon: '📄', accent: '#2563eb', label: 'Question Paper only', desc: 'For students - no answers' },
                    { mode: 'answers',   icon: '🔑', accent: '#d97706', label: 'Answer Key only',     desc: 'Separate sheet for the teacher' },
                    { mode: 'full',      icon: '🗂️', accent: '#0E7CF0', label: 'Full (Paper + Key)',   desc: 'Everything in one PDF' },
                  ].map(opt => (
                    <button key={opt.mode} onClick={() => handleDownloadPDF(opt.mode)}
                      style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{opt.icon}</span>
                      <span>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: opt.accent }}>{opt.label}</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>{opt.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setMode('setup'); setPaper(null); setQpEditing(false) }}
              style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              New Paper
            </button>
          </div>
        </div>

        {/* Rich text toolbar for question editing */}
        {qpEditing && (
          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #ede9fe' }}>
            <RichTextToolbar editorRef={qpEditAreaRef} />
            <div style={{
              padding: '6px 14px',
              background: 'linear-gradient(90deg, #faf5ff, #f5f3ff)',
              borderTop: '1px solid #ede9fe',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.72rem', color: '#0E7CF0', fontWeight: 500,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#0E7CF0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Select text in any question below, then use the toolbar to format. Changes reflect in PDF downloads.
            </div>
          </div>
        )}

        {/* Questions */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {(paper.questions || []).map((q, i) => (
            <div key={q.id || i} style={{
              padding: '18px 22px',
              borderBottom: i < paper.questions.length - 1 ? '1px solid var(--border)' : 'none',
              background: qpEditing ? '#fefce8' + '08' : 'transparent',
              transition: 'background 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                  <span style={{ background: q.type === 'mcq' ? '#dbeafe' : '#fef3c7', color: q.type === 'mcq' ? '#1d4ed8' : '#92400e',
                    padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', height: 'fit-content' }}>
                    {q.type === 'mcq' ? 'MCQ' : 'Subjective'}
                  </span>
                  {qpEditing ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.92rem', flexShrink: 0 }}>Q{i + 1}.</span>
                      <div
                        ref={el => { if (i === 0) qpEditAreaRef.current = el }}
                        contentEditable suppressContentEditableWarning
                        onBlur={e => updateQuestion(i, 'question', e.target.innerText)}
                        onFocus={e => { qpEditAreaRef.current = e.target }}
                        dangerouslySetInnerHTML={{ __html: q.question }}
                        style={{
                          flex: 1, fontWeight: 600, color: 'var(--text-1)', fontSize: '0.92rem', lineHeight: 1.5,
                          border: '1.5px solid #c4b5fd', borderRadius: 8, padding: '4px 8px',
                          background: '#faf5ff', fontFamily: 'inherit', outline: 'none',
                          minHeight: 36, cursor: 'text',
                        }} />
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.92rem', lineHeight: 1.5 }}>Q{i + 1}. {q.question}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                  {qpEditing && (
                    <input type="number" value={q.marks || 1} min={1} max={10}
                      onChange={e => updateQuestion(i, 'marks', parseInt(e.target.value) || 1)}
                      style={{ width: 42, padding: '2px 4px', border: '1.5px solid #c4b5fd', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', background: '#faf5ff', outline: 'none', fontFamily: 'inherit' }}
                    />
                  )}
                  {q.marks && <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{q.marks} Mark{q.marks > 1 ? 's' : ''}</span>}
                  {qpEditing && (
                    <button onClick={() => deleteQuestion(i)} title="Delete question"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#ef4444', opacity: 0.6, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.6}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {q.type === 'mcq' && q.options && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, marginLeft: 36 }}>
                  {q.options.map((opt, j) => {
                    const letter = ['A','B','C','D'][j]; const isCorrect = letter === q.correct
                    return (
                      <div key={letter} style={{
                        padding: '6px 10px', borderRadius: 8, fontSize: '0.85rem',
                        background: isCorrect ? '#d1fae5' : 'var(--bg)',
                        border: `1px solid ${qpEditing ? '#c4b5fd' : isCorrect ? '#10b981' : 'var(--border)'}`,
                        color: isCorrect ? '#065f46' : 'var(--text-1)', fontWeight: isCorrect ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {qpEditing && (
                          <button onClick={() => updateQuestion(i, 'correct', letter)} title={`Set ${letter} as correct`}
                            style={{ background: isCorrect ? '#10b981' : '#e5e7eb', border: 'none', width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            {isCorrect && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        )}
                        <span style={{ fontWeight: 700 }}>{letter})</span>
                        {qpEditing ? (
                          <span contentEditable suppressContentEditableWarning
                            onBlur={e => updateOption(i, j, e.target.innerText)}
                            onFocus={e => { qpEditAreaRef.current = e.target }}
                            dangerouslySetInnerHTML={{ __html: opt.replace(/^[A-D]\)\s*/i, '') }}
                            style={{ flex: 1, outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit', color: 'inherit', fontWeight: 'inherit', cursor: 'text', minWidth: 40 }} />
                        ) : (
                          <span>{opt.replace(/^[A-D]\)\s*/i, '')}</span>
                        )}
                        {isCorrect && !qpEditing && <span style={{ marginLeft: 'auto' }}>✅</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {q.explanation && (
                <div style={{ marginTop: 10, marginLeft: 36, padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5, borderLeft: '3px solid #3b82f6' }}>
                  {qpEditing ? (
                    <span contentEditable suppressContentEditableWarning
                      onBlur={e => updateQuestion(i, 'explanation', e.target.innerText)}
                      onFocus={e => { qpEditAreaRef.current = e.target }}
                      dangerouslySetInnerHTML={{ __html: q.explanation }}
                      style={{ display: 'block', width: '100%', outline: 'none', fontSize: '0.8rem', fontFamily: 'inherit', color: '#1e40af', lineHeight: 1.5, cursor: 'text', minHeight: 20 }} />
                  ) : (
                    <span>💡 {q.explanation}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    )
  }

  return null
}
