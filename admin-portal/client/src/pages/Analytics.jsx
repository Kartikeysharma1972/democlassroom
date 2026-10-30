import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../utils/api';
import Header from '../components/Header';

const CHART_COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46'];
const RANGES = [7, 30, 90];

const titleCase = (s) => (s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function shortDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function Card({ title, subtitle, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white rounded-2xl border border-gray-200 p-5"
    >
      <h2 className="font-display font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </motion.div>
  );
}

const Empty = ({ children = 'Nothing to show yet.' }) => (
  <p className="text-sm text-gray-400 py-14 text-center">{children}</p>
);

export default function Analytics() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [usage, setUsage] = useState([]);
  const [tools, setTools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [effectiveness, setEffectiveness] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get(`/analytics/usage-over-time?days=${days}`),
      api.get('/analytics/tool-popularity'),
      api.get('/analytics/grade-coverage'),
      api.get('/analytics/curriculum-coverage'),
      api.get('/analytics/teacher-effectiveness'),
    ])
      .then(([u, t, g, c, e]) => {
        if (cancelled) return;
        setUsage(u.data.data || []);
        setTools(t.data.data || []);
        setGrades(g.data.data || []);
        setSubjects(c.data.data || []);
        setEffectiveness(e.data.data || []);
        setError('');
      })
      .catch(() => { if (!cancelled) setError('Failed to load analytics.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [days]);

  const usageData = usage.map(r => ({ date: shortDate(r.date), count: r.count }));
  const toolData = tools.map(t => ({ name: titleCase(t.tool), value: t.count }));

  if (loading) {
    return (
      <div>
        <Header title="Analytics" subtitle="How Classroom AI is being used" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Analytics" subtitle="How Classroom AI is being used" />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {RANGES.map(r => (
          <button key={r} onClick={() => setDays(r)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              days === r
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            Last {r} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="Generations Over Time" subtitle={`Last ${days} days`} delay={0}>
          {usageData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#usageFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty>No generations in this window.</Empty>}
        </Card>

        <Card title="Tool Popularity" subtitle="Across all time" delay={0.05}>
          {toolData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={toolData} dataKey="value" nameKey="name"
                  cx="50%" cy="46%" innerRadius={52} outerRadius={88} paddingAngle={2}>
                  {toolData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="Grade Coverage" subtitle="Which grades staff generate material for" delay={0.1}>
          {grades.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={grades}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="Lessons" fill="#10b981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="Curriculum Coverage" subtitle="Subjects and how many distinct topics" delay={0.15}>
          {subjects.length ? (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Subject', 'Lessons', 'Topics', 'Teachers'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjects.slice(0, 8).map((s, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-gray-800">{s.subject}</td>
                      <td className="py-2 px-3 text-gray-600">{s.count}</td>
                      <td className="py-2 px-3 text-gray-600">{s.topics}</td>
                      <td className="py-2 px-3 text-gray-600">{s.teachers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty />}
        </Card>
      </div>

      <Card title="Teacher Activity" subtitle="Volume, breadth of tools and how many days they worked" delay={0.2}>
        {effectiveness.length ? (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Teacher', 'Lessons', 'Tools', 'Subjects', 'Grades', 'Active Days', 'Score'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {effectiveness.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/teachers/${t.id}`)}>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{t.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{t.lessons}</td>
                    <td className="py-2.5 px-3 text-gray-600">{t.tools_used}</td>
                    <td className="py-2.5 px-3 text-gray-600">{t.subjects}</td>
                    <td className="py-2.5 px-3 text-gray-600">{t.grades}</td>
                    <td className="py-2.5 px-3 text-gray-600">{t.active_days}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-bold rounded-md">
                        {t.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No teacher has generated anything yet.</Empty>}
      </Card>
    </div>
  );
}
