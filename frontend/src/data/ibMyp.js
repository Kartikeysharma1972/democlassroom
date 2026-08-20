// IB MYP assessment model reference data.
// Powers the narrative Feedback Writer: each subject group is assessed against
// four criteria (A–D), every criterion scored 1–8 as a *descriptor level* (not a
// pass/fail mark). Feedback also captures an ATL skill focus (the "how") and
// Learner Profile observations (the "who").

// ── Subject groups & their four criteria (official MYP objectives) ──
export const MYP_SUBJECT_GROUPS = [
  {
    key: 'language_literature',
    name: 'Language & Literature',
    criteria: [
      { key: 'A', name: 'Analysing' },
      { key: 'B', name: 'Organizing' },
      { key: 'C', name: 'Producing text' },
      { key: 'D', name: 'Using language' },
    ],
  },
  {
    key: 'language_acquisition',
    name: 'Language Acquisition',
    criteria: [
      { key: 'A', name: 'Comprehending spoken & visual text' },
      { key: 'B', name: 'Comprehending written & visual text' },
      { key: 'C', name: 'Communicating' },
      { key: 'D', name: 'Using language' },
    ],
  },
  {
    key: 'individuals_societies',
    name: 'Individuals & Societies',
    criteria: [
      { key: 'A', name: 'Knowing & understanding' },
      { key: 'B', name: 'Investigating' },
      { key: 'C', name: 'Communicating' },
      { key: 'D', name: 'Thinking critically' },
    ],
  },
  {
    key: 'sciences',
    name: 'Sciences',
    criteria: [
      { key: 'A', name: 'Knowing & understanding' },
      { key: 'B', name: 'Inquiring & designing' },
      { key: 'C', name: 'Processing & evaluating' },
      { key: 'D', name: 'Reflecting on the impacts of science' },
    ],
  },
  {
    key: 'mathematics',
    name: 'Mathematics',
    criteria: [
      { key: 'A', name: 'Knowing & understanding' },
      { key: 'B', name: 'Investigating patterns' },
      { key: 'C', name: 'Communicating' },
      { key: 'D', name: 'Applying mathematics in real-life contexts' },
    ],
  },
  {
    key: 'arts',
    name: 'Arts',
    criteria: [
      { key: 'A', name: 'Knowing & understanding' },
      { key: 'B', name: 'Developing skills' },
      { key: 'C', name: 'Thinking creatively' },
      { key: 'D', name: 'Responding' },
    ],
  },
  {
    key: 'physical_health',
    name: 'Physical & Health Education',
    criteria: [
      { key: 'A', name: 'Knowing & understanding' },
      { key: 'B', name: 'Planning for performance' },
      { key: 'C', name: 'Applying & performing' },
      { key: 'D', name: 'Reflecting & improving performance' },
    ],
  },
  {
    key: 'design',
    name: 'Design',
    criteria: [
      { key: 'A', name: 'Inquiring & analysing' },
      { key: 'B', name: 'Developing ideas' },
      { key: 'C', name: 'Creating the solution' },
      { key: 'D', name: 'Evaluating' },
    ],
  },
]

export const getSubjectGroup = (key) =>
  MYP_SUBJECT_GROUPS.find(g => g.key === key) || null

// ── Achievement level bands (1–8) with human-friendly descriptors ──
// A "4" is not a fail — it means the student is developing that skill.
export const LEVEL_BANDS = [
  { min: 7, max: 8, label: 'Exemplary',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { min: 5, max: 6, label: 'Proficient', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { min: 3, max: 4, label: 'Developing', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { min: 1, max: 2, label: 'Beginning',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { min: 0, max: 0, label: 'Not evident', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
]

export const bandForLevel = (level) => {
  const l = Number(level) || 0
  return LEVEL_BANDS.find(b => l >= b.min && l <= b.max) || LEVEL_BANDS[LEVEL_BANDS.length - 1]
}

// Level options for the selector (0 = not assessed this term).
export const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

// ── ATL skills — Approaches to Learning (the "how") ──
export const ATL_CLUSTERS = [
  { key: 'communication',   name: 'Communication',   desc: 'Exchanging thoughts, messages and information; reading, writing and using language to gather and communicate.' },
  { key: 'social',          name: 'Social',          desc: 'Collaboration — working effectively with others, managing conflict, sharing responsibility.' },
  { key: 'self_management', name: 'Self-management',  desc: 'Organization, time and task management, managing state of mind, and reflection.' },
  { key: 'research',        name: 'Research',         desc: 'Information and media literacy — finding, interpreting, judging and creating information.' },
  { key: 'thinking',        name: 'Thinking',         desc: 'Critical thinking, creative thinking and transfer of skills across contexts.' },
]

export const getAtlCluster = (key) => ATL_CLUSTERS.find(c => c.key === key) || null

// ── Learner Profile — the character traits of the IB culture (the "who") ──
export const LEARNER_PROFILE = [
  { key: 'inquirer',     name: 'Inquirer',      desc: 'Curious; develops skills for inquiry and research.' },
  { key: 'knowledgeable',name: 'Knowledgeable', desc: 'Explores concepts and ideas across a range of disciplines.' },
  { key: 'thinker',      name: 'Thinker',       desc: 'Uses critical and creative thinking to analyse and act responsibly.' },
  { key: 'communicator', name: 'Communicator',  desc: 'Expresses ideas confidently and listens to others.' },
  { key: 'principled',   name: 'Principled',    desc: 'Acts with integrity, honesty and a sense of fairness.' },
  { key: 'open_minded',  name: 'Open-minded',   desc: 'Appreciates own and others’ cultures and perspectives.' },
  { key: 'caring',       name: 'Caring',        desc: 'Shows empathy, compassion and respect towards others.' },
  { key: 'risk_taker',   name: 'Risk-taker',    desc: 'Approaches uncertainty with courage; tries new things.' },
  { key: 'balanced',     name: 'Balanced',      desc: 'Understands the importance of intellectual, physical and emotional balance.' },
  { key: 'reflective',   name: 'Reflective',    desc: 'Thoughtfully considers the world and their own learning.' },
]

export const getLearnerAttr = (key) => LEARNER_PROFILE.find(a => a.key === key) || null
