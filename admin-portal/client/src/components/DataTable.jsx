import { motion } from 'framer-motion';

function SkeletonRow({ columns }) {
  return (
    <tr>
      {columns.map((col, i) => (
        <td key={i} className="px-5 py-4">
          <div className="skeleton h-4 w-3/4 rounded" />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable({
  columns,
  data,
  onRowClick,
  loading,
  emptyMessage = 'No data found.',
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={columns} />
              ))
            ) : !data || data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-gray-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <motion.tr
                  key={row._id || row.id || index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 ${
                    index % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                  } ${onRowClick ? 'cursor-pointer hover:bg-primary-50/50' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap"
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
