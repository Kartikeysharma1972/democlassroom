import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineEnvelope,
  HiOutlineBuildingOffice2,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineWrenchScrewdriver,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);

  // Chat pagination
  const [chatPage, setChatPage] = useState(1);
  const [chatTotal, setChatTotal] = useState(0);
  const [chatPages, setChatPages] = useState(1);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  useEffect(() => {
    if (teacher) fetchChats();
  }, [teacher, chatPage]);

  const fetchTeacher = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teachers/${id}`);
      setTeacher(res.data.teacher);
      setUsageStats(res.data.usage_stats);
    } catch {
      setError('Failed to load teacher details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    setChatLoading(true);
    try {
      const res = await api.get(`/teachers/${id}/chats`, {
        params: { page: chatPage, limit: 20 },
      });
      setChats(res.data.chats || []);
      setChatTotal(res.data.total || 0);
      setChatPages(res.data.pages || 1);
    } catch {
      setChats([]);
    } finally {
      setChatLoading(false);
    }
  };

  const toolChartData = usageStats
    ? (Array.isArray(usageStats)
        ? usageStats.map((s) => ({
            tool: (s.tool_name || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            count: s.count,
          }))
        : Object.entries(usageStats).map(([tool, count]) => ({
            tool: tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            count,
          })))
    : [];

  const chatColumns = [
    {
      key: 'tool_name',
      label: 'Tool',
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
          {(val || '-').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'topic',
      label: 'Topic',
      render: (val) => (
        <span className="max-w-xs truncate block">{val || '-'}</span>
      ),
    },
    {
      key: 'grade_level',
      label: 'Grade',
      render: (val) => val || '-',
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (val) => val || '-',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => formatDate(val || ''),
    },
  ];

  if (loading) {
    return (
      <div>
        <Header title="Teacher Detail" />
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Teacher Detail" />
        <div className="card p-8 text-center text-red-500">{error}</div>
      </div>
    );
  }

  const totalLessons = usageStats
    ? (Array.isArray(usageStats)
        ? usageStats.reduce((a, s) => a + (s.count || 0), 0)
        : Object.values(usageStats).reduce((a, b) => a + b, 0))
    : teacher?.total_lessons || 0;

  return (
    <div>
      <button
        onClick={() => navigate('/teachers')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors"
      >
        <HiOutlineArrowLeft className="w-4 h-4" />
        Back to Teachers
      </button>

      <Header title={teacher?.name || 'Teacher'} subtitle="Teacher details and activity" />

      {/* Teacher Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-6"
      >
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-14 h-14 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0">
            {teacher?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold text-gray-900">{teacher?.name}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <HiOutlineEnvelope className="w-4 h-4" />
                {teacher?.email}
              </span>
              {teacher?.school_name && (
                <span className="flex items-center gap-1.5">
                  <HiOutlineBuildingOffice2 className="w-4 h-4" />
                  {teacher.school_name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <HiOutlineCalendar className="w-4 h-4" />
                Joined {formatDate(teacher?.created_at)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatsCard
          title="Total Lessons"
          value={totalLessons}
          icon={HiOutlineDocumentText}
          color="emerald"
          delay={0.1}
        />
        <StatsCard
          title="Tools Used"
          value={toolChartData.length}
          icon={HiOutlineWrenchScrewdriver}
          color="purple"
          delay={0.2}
        />
      </div>

      {/* Tool Usage Chart */}
      {toolChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-6 mb-6"
        >
          <h3 className="font-display font-bold text-gray-900 mb-4">Tool Usage Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={toolChartData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="tool" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent Chats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="font-display font-bold text-gray-900 mb-3">
          Recent Chat History
          <span className="text-sm font-normal text-gray-400 ml-2">({chatTotal} total)</span>
        </h3>
        <DataTable
          columns={chatColumns}
          data={chats}
          loading={chatLoading}
          onRowClick={(row) => setSelectedChat(row)}
          emptyMessage="No chats found."
        />

        {/* Pagination */}
        {chatPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setChatPage((p) => Math.max(1, p - 1))}
              disabled={chatPage === 1}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {chatPage} of {chatPages}
            </span>
            <button
              onClick={() => setChatPage((p) => Math.min(chatPages, p + 1))}
              disabled={chatPage === chatPages}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </motion.div>

      {/* Chat Detail Modal */}
      <AnimatePresence>
        {selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedChat(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-gray-900">
                    {selectedChat.topic || 'Chat Detail'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {(selectedChat.tool || '').replace(/_/g, ' ')} | {selectedChat.subject || '-'} | Grade {selectedChat.grade || '-'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <HiOutlineXMark className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {selectedChat.response_content || selectedChat.content || 'No content available.'}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
