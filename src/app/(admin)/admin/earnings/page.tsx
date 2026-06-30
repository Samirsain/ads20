'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  ArrowRightLeft,
} from 'lucide-react'

interface UserEarning {
  userId: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    walletBalance: string
  } | null
  totalEarned: number
  conversions: number
}

interface EarningsData {
  filterDate: string | null
  platformTotal: number
  totalConversions: number
  users: UserEarning[]
}

type FilterMode = 'today' | 'tomorrow' | 'custom' | 'all'

function toISTDateString(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('today')
  const [customDate, setCustomDate] = useState<string>(() => toISTDateString(new Date()))

  const getActiveDateStr = useCallback((): string | null => {
    const now = new Date()
    if (filterMode === 'today') return toISTDateString(now)
    if (filterMode === 'tomorrow') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      return toISTDateString(tomorrow)
    }
    if (filterMode === 'custom') return customDate
    return null
  }, [filterMode, customDate])

  const fetchEarnings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const dateStr = getActiveDateStr()
      const params = new URLSearchParams()
      if (dateStr) params.set('date', dateStr)
      const res = await fetch(`/api/admin/earnings?${params}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load earnings')
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [getActiveDateStr])

  useEffect(() => {
    fetchEarnings()
  }, [filterMode, customDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeDateStr = getActiveDateStr()

  const tabs: { mode: FilterMode; label: string; emoji: string }[] = [
    { mode: 'today', label: 'Aaj', emoji: '🟢' },
    { mode: 'tomorrow', label: 'Kal', emoji: '🔵' },
    { mode: 'custom', label: 'Custom Date', emoji: '📅' },
    { mode: 'all', label: 'All Time', emoji: '📊' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-violet-600" />
            Earnings Overview
          </h1>
          <p className="text-slate-500 mt-1">Sabhi traffic users ki date-wise earning dekho</p>
        </div>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ mode, label, emoji }) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                filterMode === mode
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-700'
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {filterMode === 'custom' && (
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition"
            />
            {customDate && (
              <span className="text-sm text-slate-500 font-medium">
                {formatDisplayDate(customDate)}
              </span>
            )}
          </div>
        )}

        {activeDateStr && filterMode !== 'all' && (
          <p className="text-xs text-slate-400">
            Showing earnings for:{' '}
            <span className="font-semibold text-slate-600">{formatDisplayDate(activeDateStr)}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl p-5 shadow-lg shadow-violet-500/25 col-span-1">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {filterMode === 'today' ? 'Aaj Platform Total' : filterMode === 'tomorrow' ? 'Kal Platform Total' : filterMode === 'custom' ? 'Is Din Platform Total' : 'All-Time Platform Total'}
            </span>
          </div>
          {loading ? (
            <div className="h-9 w-32 bg-white/30 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-4xl font-bold font-mono">${Number(data?.platformTotal ?? 0).toFixed(2)}</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Conversions</span>
          </div>
          {loading ? (
            <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-4xl font-bold text-slate-900">{data?.totalConversions ?? 0}</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Users</span>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-slate-200 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-4xl font-bold text-slate-900">{data?.users.length ?? 0}</p>
          )}
        </div>
      </div>

      {/* Per-User Earnings Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Per-User Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Conversions</th>
                <th className="px-6 py-4">Earned (This Period)</th>
                <th className="px-6 py-4">Wallet Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-5" colSpan={5}>
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : !data || data.users.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-slate-400" colSpan={5}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <span className="font-medium">
                        {filterMode === 'today'
                          ? 'Aaj kisi ne bhi earning nahi ki'
                          : filterMode === 'tomorrow'
                          ? 'Kal ke liye koi earning nahi'
                          : 'Koi earnings nahi mili'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.users.map((item, idx) => (
                  <tr key={item.userId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-6 py-4">
                      {item.user ? (
                        <div>
                          <div className="font-semibold text-slate-900">{item.user.name}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{item.user.email}</div>
                          {item.user.phone && (
                            <div className="text-slate-400 text-xs">{item.user.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">{item.userId}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700">
                        {item.conversions} conversions
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 text-base">
                      ${item.totalEarned.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      ${Number(item.user?.walletBalance ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
