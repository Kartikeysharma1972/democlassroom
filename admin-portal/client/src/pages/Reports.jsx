import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePrinter, HiOutlineArrowDownTray } from 'react-icons/hi2';
import api from '../utils/api';
import Header from '../components/Header';

const titleCase = (s) => (s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function Section({ title, delay, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="card p-6"
    >
      <h2 className="font-display font-bold text-lg text-gray-900 mb-4 border-b border-gray-100 pb-2">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map(h => (
              <th key={h} className="text-left py-2 px-3 font-semibold text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{rows}</tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/export/report')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load report data.'))
      .finally(() => setLoading(false));
  }, []);

  // The CSV routes stream a file, so they need the token on the URL rather
  // than the axios header interceptor.
  const download = async (path, filename) => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed.');
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Reports" subtitle="Printable summary report" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <Header title="Reports" subtitle="Printable summary report" />
        <div className="card p-8 text-center text-red-500">{error}</div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const toolUsage = data?.tool_usage || [];
  const gradeCoverage = data?.grade_coverage || [];
  const topTeachers = data?.top_teachers || [];
  const totalLessons = overview.total_lessons || 0;

  return (
    <div>
      <div className="no-print">
        <Header title="Reports" subtitle="Printable summary report" />
      </div>

      <div className="no-print mb-6 flex flex-wrap gap-3">
        <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2">
          <HiOutlinePrinter className="w-5 h-5" />
          Print Report
        </button>
        <button onClick={() => download('/export/teachers', 'teachers.csv')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <HiOutlineArrowDownTray className="w-5 h-5" />
          Teachers CSV
        </button>
        <button onClick={() => download('/export/activity', 'activity.csv')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <HiOutlineArrowDownTray className="w-5 h-5" />
          Activity CSV
        </button>
      </div>

      <div className="space-y-6 max-w-4xl">
        <div className="print-only mb-8">
          <h1 className="text-2xl font-display font-bold text-gray-900">Codevidhya Classroom AI Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generated on {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        <Section title="Overview" delay={0}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Teachers', value: overview.total_teachers ?? '-' },
              { label: 'Lessons Generated', value: totalLessons || '-' },
              { label: 'Active Teachers Today', value: overview.active_teachers_today ?? '-' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </Section>

        {toolUsage.length > 0 && (
          <Section title="Tool Usage" delay={0.1}>
            <Table headers={['Tool', 'Times Used', '% of Total']} rows={
              toolUsage.map((t, i) => (
                <tr key={i}>
                  <td className="py-2 px-3 font-medium">{titleCase(t.tool)}</td>
                  <td className="py-2 px-3">{t.count}</td>
                  <td className="py-2 px-3">
                    {totalLessons ? `${((t.count / totalLessons) * 100).toFixed(1)}%` : '-'}
                  </td>
                </tr>
              ))
            } />
          </Section>
        )}

        {gradeCoverage.length > 0 && (
          <Section title="Grade Coverage" delay={0.2}>
            <Table headers={['Grade', 'Lessons Generated']} rows={
              gradeCoverage.map((g, i) => (
                <tr key={i}>
                  <td className="py-2 px-3 font-medium">{g.grade}</td>
                  <td className="py-2 px-3">{g.count}</td>
                </tr>
              ))
            } />
          </Section>
        )}

        {topTeachers.length > 0 && (
          <Section title="Most Active Teachers" delay={0.3}>
            <Table headers={['Name', 'Email', 'Lessons']} rows={
              topTeachers.map((t, i) => (
                <tr key={i}>
                  <td className="py-2 px-3 font-medium">{t.name}</td>
                  <td className="py-2 px-3 text-gray-500">{t.email}</td>
                  <td className="py-2 px-3 font-semibold text-primary-700">{t.lessons}</td>
                </tr>
              ))
            } />
          </Section>
        )}
      </div>
    </div>
  );
}
