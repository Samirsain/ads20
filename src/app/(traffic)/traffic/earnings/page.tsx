'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface Earning {
  id: string
  externalUserId: string
  amount: string
  createdAt: string
  trafficLink: { uniqueCode: string; targetUrl: string }
}

type FilterMode = 'today' | 'tomorrow' | 'custom' | 'all'

function toISTDateString(d: Date): string {
  // Returns YYYY-MM-DD in IST timezone
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrafficEarningsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('today')
  const [customDate, setCustomDate] = useState<string>(() => toISTDateString(new Date()))
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const getActiveDateStr = useCallback((): string | null => {
    const now = new Date()
    if (filterMode === 'today') return toISTDateString(now)
    if (filterMode === 'tomorrow') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      return toISTDateString(tomorrow)
    }
    if (filterMode === 'custom') return customDate
    return null // 'all'
  }, [filterMode, customDate])

  const fetchEarnings = useCallback(async (pg: number = 1) => {
    setLoading(true)
    setError('')
    try {
      const dateStr = getActiveDateStr()
      const params = new URLSearchParams({ page: String(pg), limit: '50' })
      if (dateStr) params.set('date', dateStr)
      const res = await fetch(`/api/traffic/earnings?${params}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load earnings')
      setEarnings(json.data.earnings || [])
      setTotalAmount(json.data.totalAmount ?? 0)
      setTotalCount(json.data.pagination.total ?? 0)
      setTotalPages(json.data.pagination.pages ?? 1)
      setPage(pg)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [getActiveDateStr])

  useEffect(() => {
    setPage(1)
    fetchEarnings(1)
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
            <TrendingUp className="h-8 w-8 text-teal-500" />
            Earnings
          </h1>
          <p className="text-slate-500 mt-1">Apni date-wise earning dekho</p>
        </div>
        <button
          onClick={() => fetchEarnings(page)}
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
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700'
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
              max={toISTDateString(new Date(Date.now() + 86400000))}
              onChange={(e) => setCustomDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition"
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
            Showing earnings for: <span className="font-semibold text-slate-600">{formatDisplayDate(activeDateStr)}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg shadow-teal-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 opacity-80" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              {filterMode === 'today' ? "Aaj Ki Earning" : filterMode === 'tomorrow' ? "Kal Ki Earning" : filterMode === 'custom' ? "Is Din Ki Earning" : "Total Earning"}
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-white/30 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-bold font-mono">${Number(totalAmount).toFixed(2)}</p>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversions</span>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-bold text-slate-900">{totalCount}</p>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">UID</th>
                <th className="px-6 py-4">Link Code</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-5" colSpan={5}>
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : earnings.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-slate-400" colSpan={5}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <span className="font-medium">
                        {filterMode === 'today' ? 'Aaj koi earning nahi hui' : filterMode === 'tomorrow' ? 'Kal ke liye abhi koi earning nahi' : 'Koi earning nahi mili'}
                      </span>
                      <span className="text-xs text-slate-400">Is date ke liye koi conversion record nahi hai</span>
                    </div>
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-mono text-xs text-slate-400">{earning.id.slice(0, 12)}…</div>
                        <div className="text-slate-900 font-semibold mt-0.5">UID: {earning.externalUserId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-teal-600 text-xs">
                        {earning.trafficLink.uniqueCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                      ${Number(earning.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> CREDITED
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {new Date(earning.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} ({totalCount} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchEarnings(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => fetchEarnings(page + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
