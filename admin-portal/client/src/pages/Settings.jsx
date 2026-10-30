import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineTrash, HiOutlineUserPlus } from 'react-icons/hi2';
import api from '../utils/api';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'principal', label: 'Principal' },
  { value: 'vice_principal', label: 'Vice Principal' },
  { value: 'coordinator', label: 'Coordinator' },
];

const BLANK = { name: '', email: '', password: '', school: '', role: 'coordinator' };

const roleLabel = (v) => ROLES.find(r => r.value === v)?.label || v;

function formatDate(value) {
  if (!value) return '-';
  // SQLite stores UTC with no zone marker, which browsers read inconsistently.
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Settings() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/management/admins')
      .then(res => setAdmins(res.data.admins || []))
      .catch(() => setError('Failed to load admins.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setAdding(true);
    try {
      await api.post('/management/admins', form);
      setForm(BLANK);
      setNotice('Admin added.');
      setTimeout(() => setNotice(''), 3000);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not add that admin.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.name}? They will lose access immediately.`)) return;
    setError('');
    try {
      await api.delete(`/management/admins/${row.id}`);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not remove that admin.');
    }
  };

  return (
    <div>
      <Header title="Settings" subtitle="Who can open this portal" />

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-sm">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-bold text-gray-900">Admin Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Teachers sign in separately and never appear here.
            </p>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Role', 'School', 'Added', ''].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {admins.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-md">
                          {roleLabel(row.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{row.school || '-'}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        {row.id === admin?.id ? (
                          <span className="text-xs text-gray-400">You</span>
                        ) : (
                          <button onClick={() => remove(row)} title={`Remove ${row.name}`}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <HiOutlineTrash className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 h-fit"
        >
          <h2 className="font-display font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineUserPlus className="w-5 h-5 text-primary-600" />
            Add an Admin
          </h2>

          <form onSubmit={add} className="mt-4 space-y-3">
            {[
              { k: 'name', label: 'Full name', type: 'text', ph: 'e.g. Anita Verma' },
              { k: 'email', label: 'Email', type: 'text', ph: 'name@school.edu' },
              { k: 'password', label: 'Password', type: 'password', ph: 'At least 6 characters' },
              { k: 'school', label: 'School', type: 'text', ph: 'e.g. DPS Jaipur' },
            ].map(f => (
              <div key={f.k}>
                <label htmlFor={f.k} className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <input id={f.k} type={f.type} placeholder={f.ph} value={form[f.k]} onChange={set(f.k)}
                  autoComplete={f.k === 'password' ? 'new-password' : 'off'}
                  {...(f.k === 'email' ? { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } : {})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500" />
              </div>
            ))}

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select id="role" value={form.role} onChange={set('role')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <button type="submit" disabled={adding} className="btn-primary w-full disabled:opacity-60">
              {adding ? 'Adding...' : 'Add Admin'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
