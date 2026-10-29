import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import PortalSessionNotice from './pages/PortalSessionNotice'
import Dashboard from './pages/Dashboard'
import WorksheetGenerator from './pages/WorksheetGenerator'
import LessonPlanGenerator from './pages/LessonPlanGenerator'
import TeacherInsights from './pages/TeacherInsights'
import QuestionPaperGenerator from './pages/QuestionPaperGenerator'
import ClassActivityGenerator from './pages/ClassActivityGenerator'
import CodeDebugger from './pages/CodeDebugger'
import FeedbackSummarizer from './pages/FeedbackSummarizer'
import VocabularyMastery from './pages/VocabularyMastery'
import ReadingComprehension from './pages/ReadingComprehension'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', fontFamily: "'Inter', 'Outfit', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, border: '3px solid #e2e8f0', borderTopColor: '#1E88FF',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Login/portal-gate intentionally bypassed - the Codevidhya portal already
  // authenticated the user, so we always render the app shell.

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {/* Slim shared platform bar - ties the app back to the Codevidhya portal */}
        <div style={{
          height: 36, background: '#0d1f3a', color: 'rgba(255,255,255,.85)', fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        }}>
          <a href={import.meta.env.VITE_PORTAL_URL || 'http://localhost:3000/'} style={{ color: 'inherit', textDecoration: 'none' }}>◂ Codevidhya <b>AI</b> Platform</a>
          <span style={{ color: 'rgba(255,255,255,.55)' }}>Classroom AI · Teaching Assistant</span>
        </div>
        <Header />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/worksheet" element={<WorksheetGenerator />} />
          <Route path="/lesson-plan" element={<LessonPlanGenerator />} />

          <Route path="/class-activity" element={<ClassActivityGenerator />} />
          <Route path="/teacher-insights" element={<TeacherInsights />} />
          <Route path="/question-paper" element={<QuestionPaperGenerator />} />
          <Route path="/code-debugger" element={<CodeDebugger />} />
          <Route path="/feedback" element={<FeedbackSummarizer />} />
          <Route path="/vocabulary" element={<VocabularyMastery />} />
          <Route path="/comprehension" element={<ReadingComprehension />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
