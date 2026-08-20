import React from 'react'
import CustomSelect from './CustomSelect'
import { LANGUAGES } from '../data/languages'

/**
 * Output-language picker shared across all generator tools.
 * The model writes its output in the chosen language while keeping formulas,
 * code and technical terms in English. Props: value, onChange, accent (border color).
 */
export default function LanguageSelect({ value, onChange, accent }) {
  return (
    <div className="form-group">
      <label className="form-label">Output Language</label>
      <CustomSelect value={value || 'English'} onChange={onChange}
        style={{ borderColor: accent || 'var(--border)' }}>
        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </CustomSelect>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 4 }}>
        Formulas, code & technical terms stay in English.
      </div>
    </div>
  )
}
