import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES } from '../data/languages'
import { GRADE_OPTIONS } from '../data/cbseSubjects'
import {
  MYP_SUBJECT_GROUPS, getSubjectGroup, bandForLevel, LEVEL_OPTIONS,
  ATL_CLUSTERS, getAtlCluster, LEARNER_PROFILE, getLearnerAttr,
} from '../data/ibMyp'

const API = window.location.hostname === 'localhost' ? 'http://localhost:8001' : window.location.origin
const STORAGE_KEY = 'classroom-result-feedback-myp'

// Wipe any persisted result so the tool always opens fresh - no previous
// session is restored. (The user wants a clean slate every time.)
try { localStorage.removeItem(STORAGE_KEY) } catch {}

const TONES = [
  { value: 'constructive', label: '🛠️ Constructive' },
  { value: 'encouraging',  label: '🌟 Encouraging' },
  { value: 'formal',       label: '🎓 Formal' },
  { value: 'warm',         label: '💝 Warm' },
  { value: 'professional', label: '💼 Professional' },
]

// Inline editable text block - uncontrolled so the caret never jumps; commits on blur.
function EditableText({ value, editing, onChange, style }) {
  return (
    <div
      contentEditable={editing}
      suppressContentEditableWarning
      onBlur={e => { const t = e.currentTarget.innerText.trim(); if (t !== value) onChange(t) }}
      style={{
        outline: 'none', whiteSpace: 'pre-wrap',
        ...(editing ? { background: '#fffbeb', borderRadius: 6, padding: '3px 7px', boxShadow: 'inset 0 0 0 1.5px #fde68a' } : {}),
        ...style,
      }}
    >{value}</div>
  )
}

function LevelBadge({ level, small }) {
  const b = bandForLevel(level)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: small ? '2px 8px' : '4px 11px', borderRadius: 100,
      background: b.bg, color: b.color, border: `1px solid ${b.border}`,
      fontSize: small ? 11 : 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <strong style={{ fontSize: small ? 12 : 14 }}>{level}</strong>/8 · {b.label}
    </span>
  )
}

export default function FeedbackSummarizer() {
  const { user } = useAuth()
  const [studentName, setStudentName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [groupKey, setGroupKey] = useState('sciences')
  const [subject, setSubject] = useState('')
  const [levels, setLevels] = useState({})       // { A: 7, B: 4, ... }
  const [critNotes, setCritNotes] = useState({}) // { A: 'note', ... }
  const [atlFocus, setAtlFocus] = useState('')
  const [atlNote, setAtlNote] = useState('')
  const [learnerKeys, setLearnerKeys] = useState([])
  const [learnerNote, setLearnerNote] = useState('')
  const [tone, setTone] = useState('constructive')
  const [language, setLanguage] = useState('English')
  const [context, setContext] = useState('')

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (result) localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
  }, [result])

  const group = getSubjectGroup(groupKey)
  const assessedCount = group ? group.criteria.filter(c => (levels[c.key] || 0) > 0).length : 0

  const changeGroup = (k) => { setGroupKey(k); setLevels({}); setCritNotes({}) }
  const setLevel = (k, v) => setLevels(l => ({ ...l, [k]: v }))
  const setNote = (k, v) => setCritNotes(n => ({ ...n, [k]: v }))
  const toggleLearner = (k) =>
    setLearnerKeys(ks => ks.includes(k) ? ks.filter(x => x !== k) : (ks.length >= 3 ? ks : [...ks, k]))

  const handleGenerate = async (e) => {
    e?.preventDefault()
    setError('')
    if (!studentName.trim()) { setError('Student name is required.'); return }
    if (!gradeLevel) { setError('Please select a grade level.'); return }
    if (!group) { setError('Please select a subject group.'); return }
    if (assessedCount === 0) { setError('Assess at least one criterion (set a level of 1-8).'); return }
    setLoading(true); setResult(null)
    try {
      const criteria = group.criteria
        .map(c => ({ key: c.key, name: c.name, level: levels[c.key] || 0, note: critNotes[c.key] || '' }))
        .filter(c => c.level > 0)
      const res = await fetch(`${API}/api/generate-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentName,
          grade_level: gradeLevel,
          subject: subject.trim(),
          subject_group: group.name,
          criteria,
          atl_focus: atlFocus ? getAtlCluster(atlFocus)?.name || '' : '',
          atl_note: atlNote,
          learner_attributes: learnerKeys.map(k => getLearnerAttr(k)?.name).filter(Boolean),
          learner_note: learnerNote,
          tone,
          context,
          language,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Server error') }
      const data = await res.json()
      setResult({ ...data, _student: studentName, _grade: gradeLevel })
      setEditing(false)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── edits to the generated report (write back into result state) ──
  const editCriterion = (key, field, val) => setResult(r => ({
    ...r, criteria: r.criteria.map(c => c.key === key ? { ...c, [field]: val } : c),
  }))
  const editAtl = (val) => setResult(r => ({ ...r, atl: { ...r.atl, narrative: val } }))
  const editLearner = (val) => setResult(r => ({ ...r, learner_profile: { ...r.learner_profile, narrative: val } }))
  const editOverall = (val) => setResult(r => ({ ...r, overall: val }))

  const buildPlainText = (r) => {
    const lines = [`${r._student} - ${r.subject || r.subject_group} (${r._grade})`, '']
    r.criteria?.forEach(c => {
      lines.push(`Criterion ${c.key}: ${c.name} - ${c.level}/8 (${c.band})`)
      if (c.narrative) lines.push(c.narrative)
      if (c.action_step) lines.push(`Action Step: ${c.action_step}`)
      lines.push('')
    })
    if (r.atl?.narrative) { lines.push(`ATL Skill Focus (${r.atl.focus}):`, r.atl.narrative, '') }
    if (r.learner_profile?.narrative) {
      lines.push(`Learner Profile (${(r.learner_profile.attributes || []).join(', ')}):`, r.learner_profile.narrative, '')
    }
    if (r.overall) lines.push(r.overall)
    return lines.join('\n')
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(buildPlainText(result))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const handleReset = () => {
    setStudentName(''); setGradeLevel(''); setGroupKey('sciences'); setSubject('')
    setLevels({}); setCritNotes({}); setAtlFocus(''); setAtlNote(''); setLearnerKeys([]); setLearnerNote('')
    setTone('constructive'); setLanguage('English'); setContext('')
    setResult(null); setError(''); setEditing(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleDownload = () => {
    if (!result) return
    const r = result
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const toneLabel = TONES.find(t => t.value === r.tone)?.label?.replace(/^[^ ]+ /, '') || r.tone

    const critRows = (r.criteria || []).map(c => {
      const b = bandForLevel(c.level)
      const action = c.action_step
        ? `<div style="margin-top:8px;padding:8px 12px;background:#EEF6FF;border-left:3px solid #1E88FF;border-radius:0 8px 8px 0;font-size:12.5px;color:#0A4F9C;"><strong>➜ Action Step:</strong> ${esc(c.action_step)}</div>`
        : ''
      return `<tr>
        <td style="padding:12px 14px;border:1px solid #e2e8f0;vertical-align:top;width:34%;">
          <div style="font-size:11px;color:#94a3b8;font-weight:700;">CRITERION ${esc(c.key)}</div>
          <div style="font-size:13.5px;font-weight:700;color:#1a1a2e;margin-top:2px;">${esc(c.name)}</div>
        </td>
        <td style="padding:12px 14px;border:1px solid #e2e8f0;text-align:center;vertical-align:top;width:16%;">
          <div style="font-size:22px;font-weight:800;color:${b.color};">${c.level}<span style="font-size:13px;color:#94a3b8;font-weight:600;">/8</span></div>
          <div style="display:inline-block;margin-top:4px;padding:2px 9px;border-radius:100px;background:${b.bg};color:${b.color};border:1px solid ${b.border};font-size:11px;font-weight:700;">${b.label}</div>
        </td>
        <td style="padding:12px 14px;border:1px solid #e2e8f0;vertical-align:top;font-size:13px;line-height:1.65;color:#334155;">
          ${esc(c.narrative)}${action}
        </td>
      </tr>`
    }).join('')

    const atlBlock = r.atl?.narrative ? `
      <div style="margin-top:20px;background:#f0fdfa;border:1.5px solid #99f6e4;border-radius:12px;padding:16px 20px;">
        <div style="font-size:13px;font-weight:800;color:#0f766e;margin-bottom:6px;">🧭 ATL Skill Focus · ${esc(r.atl.focus)}</div>
        <div style="font-size:13px;line-height:1.7;color:#134e4a;">${esc(r.atl.narrative)}</div>
      </div>` : ''

    const lpBlock = r.learner_profile?.narrative ? `
      <div style="margin-top:14px;background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:12px;padding:16px 20px;">
        <div style="font-size:13px;font-weight:800;color:#7e22ce;margin-bottom:6px;">🌱 Learner Profile · ${esc((r.learner_profile.attributes || []).join(', '))}</div>
        <div style="font-size:13px;line-height:1.7;color:#581c87;">${esc(r.learner_profile.narrative)}</div>
      </div>` : ''

    const overallBlock = r.overall ? `
      <div style="margin-top:14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:16px 20px;">
        <div style="font-size:13px;font-weight:800;color:#1d4ed8;margin-bottom:6px;">📝 Overall</div>
        <div style="font-size:13px;line-height:1.7;color:#1e3a8a;">${esc(r.overall)}</div>
      </div>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MYP Report - ${esc(r._student)}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:40px 30px;color:#0f172a;background:#fff;}
  .header{text-align:center;border-bottom:3px solid #1E88FF;padding-bottom:18px;margin-bottom:22px;}
  .title{font-size:25px;font-weight:800;color:#1E88FF;letter-spacing:-0.5px;}
  .meta-row{display:flex;gap:14px;background:#EEF6FF;padding:16px 20px;border-radius:12px;margin-bottom:20px;}
  .meta-cell{flex:1;}
  .meta-label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;}
  .meta-value{font-size:17px;font-weight:700;margin-top:3px;color:#1a1a2e;}
  table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;}
  th{background:#1E88FF;color:#fff;padding:11px 14px;text-align:left;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
  .footer{border-top:2px solid #e2e8f0;padding-top:14px;margin-top:24px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;}
  @media print{body{padding:20px;}}
</style></head><body>
<div class="header">
  <div class="title">📋 Student Progress Report</div>
  <div style="font-size:12px;color:#64748b;margin-top:6px;">IB MYP Narrative Feedback · ClassroomAI · ${date}</div>
</div>
<div class="meta-row">
  <div class="meta-cell"><div class="meta-label">Student</div><div class="meta-value">${esc(r._student)}</div></div>
  <div class="meta-cell"><div class="meta-label">Grade</div><div class="meta-value">${esc(r._grade)}</div></div>
  <div class="meta-cell"><div class="meta-label">Subject</div><div class="meta-value">${esc(r.subject || r.subject_group)}</div></div>
</div>
<table>
  <thead><tr><th style="width:34%;">Assessment Criterion</th><th style="width:16%;text-align:center;">Level (1-8)</th><th>Teacher Narrative Feedback</th></tr></thead>
  <tbody>${critRows}</tbody>
</table>
${atlBlock}${lpBlock}${overallBlock}
<div class="footer">
  <div>Teacher: ${esc(user?.name || 'Teacher')}${user?.email ? ' · ' + esc(user.email) : ''}</div>
  <div>Powered by <strong style="color:#1E88FF;">ClassroomAI</strong> by CodeVidhya</div>
</div>
</body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html); win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* HEADER */}
      <div className="fade-up" style={{
        background: 'linear-gradient(135deg, #1E88FF 0%, #0E7CF0 55%, #db2777 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.25)', overflow: 'hidden',
          }}>
            <img src="/codevidhya_logo.jfif" alt="CodeVidhya"
              style={{ width: '82%', height: '82%', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Narrative Feedback Writer</h1>
            <p style={{ fontSize: 13.5, margin: '4px 0 0', opacity: 0.92, fontWeight: 500 }}>
              IB MYP-style reports - score each criterion 1-8, and get skill-by-skill narrative feedback with action steps, ATL focus & Learner Profile notes.
            </p>
          </div>
        </div>
      </div>

      <div className="split-pane" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* LEFT - FORM */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', padding: 24 }}>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="👤 Student Name" required>
                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. Aman Verma" style={inputStyle} />
              </Field>
              <Field label="🎓 Grade Level" required>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle}>
                  <option value="">Select grade...</option>
                  {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="📚 Subject Group" required>
                <select value={groupKey} onChange={e => changeGroup(e.target.value)} style={inputStyle}>
                  {MYP_SUBJECT_GROUPS.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
                </select>
              </Field>
              <Field label="✏️ Subject (optional)">
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History" style={inputStyle} />
              </Field>
            </div>

            {/* Criteria */}
            <Field label={`📊 Assessment Criteria - score each 1-8 (${assessedCount} set)`} required>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group?.criteria.map(c => {
                  const lvl = levels[c.key] || 0
                  return (
                    <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8, borderBottom: '1px dashed #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#1E88FF', background: '#EEF6FF', borderRadius: 6, padding: '2px 7px' }}>{c.key}</span>
                        <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, flex: 1 }}>{c.name}</span>
                        <select value={lvl} onChange={e => setLevel(c.key, Number(e.target.value))} style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: 12.5, fontWeight: 600 }}>
                          {LEVEL_OPTIONS.map(n => (
                            <option key={n} value={n}>{n === 0 ? '- Not assessed' : `${n} · ${bandForLevel(n).label}`}</option>
                          ))}
                        </select>
                      </div>
                      {lvl > 0 && (
                        <input
                          type="text" value={critNotes[c.key] || ''} onChange={e => setNote(c.key, e.target.value)}
                          placeholder={`Optional note for ${c.key} (e.g. "strong on causes, weak on citations")`}
                          style={{ ...inputStyle, padding: '8px 11px', fontSize: 12.5 }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </Field>

            {/* ATL */}
            <Field label="🧭 ATL Skill Focus (optional)">
              <select value={atlFocus} onChange={e => setAtlFocus(e.target.value)} style={inputStyle}>
                <option value="">No ATL focus</option>
                {ATL_CLUSTERS.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
              </select>
              {atlFocus && (
                <>
                  <div style={{ fontSize: 11.5, color: '#64748b', margin: '6px 2px 0' }}>{getAtlCluster(atlFocus)?.desc}</div>
                  <textarea
                    value={atlNote} onChange={e => setAtlNote(e.target.value)}
                    placeholder='What did you observe? e.g. "Waits until the last minute to draft essays"'
                    style={{ ...inputStyle, minHeight: 56, resize: 'vertical', fontFamily: 'inherit', marginTop: 6 }}
                  />
                </>
              )}
            </Field>

            {/* Learner Profile */}
            <Field label="🌱 Learner Profile (optional · up to 3)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LEARNER_PROFILE.map(a => {
                  const on = learnerKeys.includes(a.key)
                  return (
                    <button key={a.key} type="button" title={a.desc} onClick={() => toggleLearner(a.key)}
                      style={{
                        padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: '1.5px solid', borderColor: on ? '#a855f7' : '#e2e8f0',
                        background: on ? 'linear-gradient(135deg,#a855f7,#0E7CF0)' : '#fff', color: on ? '#fff' : '#475569',
                      }}>{a.name}</button>
                  )
                })}
              </div>
              {learnerKeys.length > 0 && (
                <textarea
                  value={learnerNote} onChange={e => setLearnerNote(e.target.value)}
                  placeholder='A moment that shows this trait, e.g. "Volunteered to lead the class debate despite nerves"'
                  style={{ ...inputStyle, minHeight: 56, resize: 'vertical', fontFamily: 'inherit', marginTop: 8 }}
                />
              )}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="💖 Tone">
                <select value={tone} onChange={e => setTone(e.target.value)} style={inputStyle}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="🌐 Output Language">
                <select value={language} onChange={e => setLanguage(e.target.value)} style={inputStyle}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="✨ Extra Context (optional)">
              <textarea
                value={context} onChange={e => setContext(e.target.value)}
                placeholder="Anything else about this term? e.g. 'Missed two weeks due to illness but caught up quickly'"
                maxLength={500}
                style={{ ...inputStyle, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>{context.length}/500</div>
            </Field>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, border: '1.5px solid #fecaca' }}>⚠️ {error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={loading || assessedCount === 0} style={{
                flex: 1, padding: '13px 20px', borderRadius: 12, border: 'none',
                background: loading || assessedCount === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #1E88FF, #0E7CF0)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading || assessedCount === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(30, 136, 255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Generating...
                  </>
                ) : (assessedCount > 0 ? '✨ Generate Report' : 'Set a criterion level first')}
              </button>
              {result && (
                <button type="button" onClick={handleReset} style={{ padding: '13px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🔄 Reset</button>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT - OUTPUT */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', padding: 24, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, border: '4px solid #e2e8f0', borderTop: '4px solid #1E88FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Writing narrative feedback for each criterion...</p>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>{result._student}</h3>
                <span style={{ padding: '4px 11px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: '#EEF6FF', color: '#1E88FF', border: '1px solid #B6D9FF' }}>{result.subject || result.subject_group}</span>
                <span style={{ padding: '4px 11px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>{result._grade}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => setEditing(v => !v)} style={smallBtn}>{editing ? '✓ Done' : '✏️ Edit'}</button>
                  <button type="button" onClick={handleCopy} style={smallBtn}>{copied ? '✓ Copied' : '📋 Copy'}</button>
                  <button type="button" onClick={handleDownload} style={{ ...smallBtn, background: 'linear-gradient(135deg,#1E88FF,#0E7CF0)', color: '#fff', border: 'none' }}>⬇ Report</button>
                </div>
              </div>

              {/* Criteria cards */}
              {result.criteria?.map(c => (
                <div key={c.key} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1E88FF', background: '#EEF6FF', borderRadius: 6, padding: '2px 7px' }}>Criterion {c.key}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>{c.name}</span>
                    <span style={{ marginLeft: 'auto' }}><LevelBadge level={c.level} /></span>
                  </div>
                  <EditableText value={c.narrative} editing={editing} onChange={v => editCriterion(c.key, 'narrative', v)}
                    style={{ fontSize: 13, lineHeight: 1.65, color: '#334155' }} />
                  {(c.action_step || editing) && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#EEF6FF', borderLeft: '3px solid #1E88FF', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0A4F9C', marginBottom: 2 }}>➜ Action Step</div>
                      <EditableText value={c.action_step} editing={editing} onChange={v => editCriterion(c.key, 'action_step', v)}
                        style={{ fontSize: 12.5, lineHeight: 1.6, color: '#0A4F9C' }} />
                    </div>
                  )}
                </div>
              ))}

              {result.atl?.narrative != null && result.atl?.focus && (
                <div style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f766e', marginBottom: 6 }}>🧭 ATL Skill Focus · {result.atl.focus}</div>
                  <EditableText value={result.atl.narrative} editing={editing} onChange={editAtl}
                    style={{ fontSize: 13, lineHeight: 1.7, color: '#134e4a' }} />
                </div>
              )}

              {result.learner_profile?.narrative != null && (result.learner_profile?.attributes || []).length > 0 && (
                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7e22ce', marginBottom: 6 }}>🌱 Learner Profile · {(result.learner_profile.attributes || []).join(', ')}</div>
                  <EditableText value={result.learner_profile.narrative} editing={editing} onChange={editLearner}
                    style={{ fontSize: 13, lineHeight: 1.7, color: '#581c87' }} />
                </div>
              )}

              {(result.overall || editing) && (
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>📝 Overall</div>
                  <EditableText value={result.overall} editing={editing} onChange={editOverall}
                    style={{ fontSize: 13, lineHeight: 1.7, color: '#1e3a8a' }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: '#EEF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 16 }}>📋</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px' }}>Ready to Generate</h3>
              <p style={{ fontSize: 13.5, color: '#64748b', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
                Pick a subject group, score each criterion 1-8, and generate a narrative, criterion-by-criterion report with action steps.
              </p>
              <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['🎯 Criterion-based', '🧭 ATL skills', '🌱 Learner Profile'].map(h => (
                  <span key={h} style={{ fontSize: 11, padding: '5px 11px', borderRadius: 100, background: '#EEF6FF', color: '#1E88FF', fontWeight: 600 }}>{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 14, fontFamily: 'inherit', color: '#1a1a2e',
  outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
}

const smallBtn = {
  padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
  background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
