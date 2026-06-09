'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  prefix?: string
  suffix?: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-700',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
  },
  purple: {
    bg: 'bg-violet-50',
    icon: 'bg-violet-100 text-violet-600',
    value: 'text-violet-700',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    value: 'text-orange-700',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-700',
  },
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  prefix = '',
  suffix = '',
  color = 'blue',
}: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${colors.value}`}>
            {prefix}
            {value}
            {suffix}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.icon}`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          {trend >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={trend >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {Math.abs(trend)}% this month
          </span>
        </div>
      )}
    </div>
  )
}
