'use client'

import { useEffect, useState, useMemo } from 'react'
import { BarChart2, RefreshCw, Calendar, AlertCircle, Search } from 'lucide-react'

interface EarningRow {
  publisherId: string
  publisherName: string
  publisherEmail: string
  date: string
  impressions: number
  conversions: number
  cpmRate: number
  earnings: number
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function AdminPublisherEarningsPage() {
  const [rows, setRows] = useState<EarningRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchEarnings = async () => {
    setLoading(true)
    setError('')
    try {
      const params = dateFilter ? `?date=${dateFilter}` : ''
      const res = await fetch(`/api/admin/publisher-earnings${params}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load earnings')
      setRows(json.data || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEarnings() }, [dateFilter])

  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  const filtered = useMemo(() =>
    rows.filter(r =>
      !search ||
      r.publisherName.toLowerCase().includes(search.toLowerCase()) ||
      r.publisherEmail.toLowerCase().includes(search.toLowerCase())
    ),
    [rows, search]
  )

  const totalImpressions = filtered.reduce((s, r) => s + r.impressions, 0)
  const totalConversions = filtered.reduce((s, r) => s + r.conversions, 0)
  const totalEarnings = filtered.reduce((s, r) => s + r.earnings, 0)

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-8 w-8 text-violet-600" />
            Publisher Earnings
          </h1>
          <p className="text-slate-500 mt-1">Daily CPM-based earnings breakdown for all publishers</p>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4">
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        {[
          { label: 'All Time', value: '' },
          { label: 'Today', value: today },
          { label: 'Yesterday', value: yesterday },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setDateFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              dateFilter === value
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
        <input
          type="date"
          value={dateFilter}
          max={today}
          onChange={e => setDateFilter(e.target.value)}
          className="bg-white border border-slate-300 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <div className="ml-auto relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search publisher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-violet-500 rounded-xl pl-9 pr-4 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Summary Totals */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Impressions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalImpressions.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalConversions.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total CPM Earnings</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${totalEarnings.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Publisher</th>
                <th className="px-6 py-4 text-right">Impressions</th>
                <th className="px-6 py-4 text-right">Leads</th>
                <th className="px-6 py-4 text-right">CPM Rate</th>
                <th className="px-6 py-4 text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5" colSpan={6}><div className="h-4 bg-slate-200 rounded w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={6}>
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                      <span>No earnings data found for the selected filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(row.date)}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{row.publisherName}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{row.publisherEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-700">{row.impressions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-blue-600">{row.conversions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        ${row.cpmRate.toFixed(2)} CPM
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">${row.earnings.toFixed(4)}</td>
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
