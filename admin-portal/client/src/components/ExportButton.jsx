import { useState } from 'react';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import api from '../utils/api';

export default function ExportButton({ endpoint, filename, label = 'Export CSV' }) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently fail or could add a toast
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={downloading}
      className="btn-secondary inline-flex items-center gap-2 text-sm"
    >
      {downloading ? (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      ) : (
        <HiOutlineArrowDownTray className="w-4 h-4" />
      )}
      {downloading ? 'Downloading...' : label}
    </button>
  );
}
