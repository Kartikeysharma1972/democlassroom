import { motion } from 'framer-motion';
import { HiArrowTrendingUp, HiArrowTrendingDown, HiMinus } from 'react-icons/hi2';

const colorMap = {
  emerald: {
    bg: 'bg-primary-50',
    icon: 'bg-primary-100 text-primary-600',
    accent: 'border-l-primary-500',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    accent: 'border-l-blue-500',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    accent: 'border-l-purple-500',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    accent: 'border-l-amber-500',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-100 text-rose-600',
    accent: 'border-l-rose-500',
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'bg-cyan-100 text-cyan-600',
    accent: 'border-l-cyan-500',
  },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'emerald', delay = 0 }) {
  const colors = colorMap[color] || colorMap.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`card-hover p-5 border-l-4 ${colors.accent}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
            {value ?? <span className="skeleton inline-block w-16 h-8" />}
          </p>
          {subtitle && (
            <div className="flex items-center gap-1.5 mt-2">
              {trend === 'up' && <HiArrowTrendingUp className="w-4 h-4 text-green-500" />}
              {trend === 'down' && <HiArrowTrendingDown className="w-4 h-4 text-red-500" />}
              {trend === 'neutral' && <HiMinus className="w-4 h-4 text-gray-400" />}
              <p className={`text-xs font-medium ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {subtitle}
              </p>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
