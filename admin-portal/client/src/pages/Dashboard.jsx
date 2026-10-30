import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
  HiOutlineBolt,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../utils/api';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';

const CHART_COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46'];

function formatTimeAgo(dateStr) {
  if (!dateStr) return '-';
  // SQLite hands back "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker, which
  // Safari refuses to parse and Chrome reads as local time. Spell it out.
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return dateStr;

  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatTrend(pct) {
  if (pct == null) return { subtitle: null, trend: 'neutral' };
  const n = Number(pct);
  if (n > 0) return { subtitle: `+${n.toFixed(1)}% vs last week`, trend: 'up' };
  if (n < 0) return { subtitle: `${n.toFixed(1)}% vs last week`, trend: 'down' };
  return { subtitle: '0% vs last week', trend: 'neutral' };
}

const titleCase = (s) => (s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const trends = data?.trends || {};
  const teacherTrend = formatTrend(trends.teachers);
  const lessonTrend = formatTrend(trends.lessons);

  const toolData = Object.entries(data?.tool_usage || {}).map(([name, count]) => ({
    name: titleCase(name),
    value: count,
  }));

  const gradeData = (data?.grade_coverage || []).map(g => ({
    grade: g.grade,
    lessons: g.count,
  }));

  const activity = data?.recent_activity || [];
  const toolsInUse = toolData.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" subtitle="Classroom AI across your school, at a glance" />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">
        <StatsCard
          title="Teachers" value={data?.teachers ?? 0}
          subtitle={teacherTrend.subtitle} trend={teacherTrend.trend}
          icon={HiOutlineAcademicCap} color="emerald" delay={0}
        />
        <StatsCard
          title="Lessons Generated" value={data?.lessons ?? 0}
          subtitle={lessonTrend.subtitle} trend={lessonTrend.trend}
          icon={HiOutlineDocumentText} color="purple" delay={0.05}
        />
        <StatsCard
          title="Active Teachers Today" value={data?.active_teachers_today ?? 0}
          subtitle="Generated something today" icon={HiOutlineBolt} color="blue" delay={0.1}
        />
        <StatsCard
          title="Tools In Use" value={toolsInUse}
          subtitle="Of eight available" icon={HiOutlineSquares2X2} color="amber" delay={0.15}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-5"
        >
          <h2 className="font-display font-bold text-gray-900 mb-4">Grade Coverage</h2>
          {gradeData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="lessons" fill="#10b981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">Nothing generated yet.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-200 p-5"
        >
          <h2 className="font-display font-bold text-gray-900 mb-4">Tool Usage</h2>
          {toolData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={toolData} dataKey="value" nameKey="name"
                  cx="50%" cy="46%" innerRadius={52} outerRadius={88} paddingAngle={2}>
                  {toolData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">Nothing generated yet.</p>
          )}
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-gray-900">Recent Activity</h2>
          <button onClick={() => navigate('/teachers')}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            All teachers
          </button>
        </div>

        {activity.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Teacher', 'Tool', 'Topic', 'Time'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activity.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">
                      {row.teacher_name || <span className="text-gray-400">Not signed in</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-md">
                        {row.tool_name || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{row.topic || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-16 text-center">No activity yet.</p>
        )}
      </motion.div>
    </div>
  );
}
