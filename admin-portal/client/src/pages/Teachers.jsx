import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineAcademicCap } from 'react-icons/hi2';
import api from '../utils/api';
import Header from '../components/Header';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function Teachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teachers');
      setTeachers(res.data.teachers || []);
      setTotal(res.data.total || 0);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? teachers.filter(
        (t) =>
          t.name?.toLowerCase().includes(search.toLowerCase()) ||
          t.email?.toLowerCase().includes(search.toLowerCase()) ||
          t.school_name?.toLowerCase().includes(search.toLowerCase())
      )
    : teachers;

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
              {val?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
          <span className="font-medium text-gray-900">{val || '-'}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'school_name',
      label: 'School',
      render: (val) => val || '-',
    },
    {
      key: 'total_lessons',
      label: 'Lessons',
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
          {val ?? 0}
        </span>
      ),
    },
    {
      key: 'last_activity',
      label: 'Last Active',
      render: (val) => (
        <span className="text-gray-500">{formatTimeAgo(val)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (val) => <span className="text-gray-500">{formatDate(val)}</span>,
    },
  ];

  return (
    <div>
      <Header title="Teachers" subtitle={`${total} total teachers`} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search teachers by name, email, or school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <ExportButton endpoint="/export/teachers?format=csv" filename="teachers.csv" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          onRowClick={(row) => navigate(`/teachers/${row.id || row._id}`)}
          emptyMessage="No teachers found."
        />
      </motion.div>
    </div>
  );
}
