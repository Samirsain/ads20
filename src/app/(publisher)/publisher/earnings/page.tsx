'use client'

import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, RefreshCw, Calendar, MousePointerClick, BarChart2, DollarSign, AlertCircle } from 'lucide-react'

interface DayData {
  date: string
  impressions: number
  conversions: number
  cpmRate: number
  earnings: number
}

interface EarningsData {
  dailyData: DayData[]
  currentCpm: number
  todayEarnings: number
  totalImpressions: number
  totalEarnings: number
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function PublisherEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const fetchEarnings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/publisher/earnings')
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load earnings')
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEarnings() }, [])

  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  const filteredData = useMemo(() => {
    if (!data) return []
    if (!filter) return data.dailyData
    return data.dailyData.filter(d => d.date === filter)
  }, [data, filter])

  const filteredEarnings = filteredData.reduce((s, d) => s + d.earnings, 0)
  const filteredImpressions = filteredData.reduce((s, d) => s + d.impressions, 0)

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Earnings History
          </h1>
          <p className="text-slate-500 mt-1">Daily CPM-based earnings — filter by any date</p>
        </div>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-semibold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-blue-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Impressions</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-28" />
          ) : (
            <p className="text-3xl font-bold text-slate-900">{(data?.totalImpressions ?? 0).toLocaleString()}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">All-time link impressions</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current CPM Rate</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-28" />
          ) : (
            <p className="text-3xl font-bold text-emerald-600">${(data?.currentCpm ?? 0.5).toFixed(2)}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Per 1,000 impressions today</p>
        </div>

        <div className="bg-white border border-purple-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Earnings</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-28" />
          ) : (
            <p className="text-3xl font-bold text-slate-900">${(data?.totalEarnings ?? 0).toFixed(2)}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Based on CPM across all days</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4">
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
        {[
          { label: 'All', value: '' },
          { label: 'Today', value: today },
          { label: 'Yesterday', value: yesterday },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
        <input
          type="date"
          value={filter}
          max={today}
          onChange={e => setFilter(e.target.value)}
          className="bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="text-xs text-slate-400 hover:text-slate-700 transition underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Earnings Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Impressions</th>
                <th className="px-6 py-4 text-right">Leads</th>
                <th className="px-6 py-4 text-right">CPM Rate</th>
                <th className="px-6 py-4 text-right">Earnings (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5" colSpan={5}><div className="h-4 bg-slate-200 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={5}>
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                      <span>No earnings data for the selected period</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredData.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{formatDate(row.date)}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">{row.impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-blue-600">{row.conversions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                          ${row.cpmRate.toFixed(2)} CPM
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">${row.earnings.toFixed(4)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-300">
                    <td className="px-6 py-3 font-bold text-slate-700">
                      {filter ? formatDate(filter) : 'All Time'} Total
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">{filteredImpressions.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-400">—</td>
                    <td className="px-6 py-3 text-right text-slate-400">—</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-blue-600">${filteredEarnings.toFixed(4)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info note */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs">
        <strong>How CPM is calculated:</strong> Your CPM rate is based on your traffic quality (conversion rate). Higher conversion rates = higher CPM. Range: $0.50 – $20.00 per 1,000 impressions.
      </div>
    </div>
  )
}
