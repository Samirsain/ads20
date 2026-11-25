'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  RefreshCw,
  Calendar,
  MousePointerClick,
  BarChart2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface DayData {
  date: string
  impressions: number
  validClicks: number
  cpmRate: number
  earnings: number
  settlementStatus: string
}

interface EarningsData {
  timezone: string
  todayDate: string
  dailyData: DayData[]
  currentCpm: number
  todayEarnings: number
  yesterdayEarnings: number
  availableBalance: number
  pendingPayment: number
  totalPaid: number
  totalImpressions: number
  totalEarnings: number
}

function addDaysStr(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10)
}

function settlementBadge(status: string) {
  switch (status) {
    case 'SETTLED':
    case 'LEGACY_SETTLED':
      return { text: 'Settled', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    case 'ACCRUING_TODAY':
      return { text: 'Accruing Today (Next-Day)', cls: 'bg-blue-50 border-blue-200 text-blue-700' }
    case 'PENDING_SETTLEMENT':
      return { text: 'Pending Settlement', cls: 'bg-amber-50 border-amber-200 text-amber-700' }
    case 'EXCEPTION':
      return { text: 'Review', cls: 'bg-red-50 border-red-200 text-red-700' }
    default:
      return { text: '—', cls: 'bg-slate-100 border-slate-200 text-slate-500' }
  }
}

export default function PublisherEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const loadEarnings = useCallback(async () => {
    const res = await fetch('/api/publisher/earnings')
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load earnings')
    return json.data as EarningsData
  }, [])

  const fetchEarnings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadEarnings())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadEarnings])

  useEffect(() => {
    let active = true
    loadEarnings()
      .then((d) => { if (active) setData(d) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Something went wrong') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadEarnings])

  const today = data?.todayDate ?? ''
  const yesterday = today ? addDaysStr(today, -1) : ''

  const filteredData = useMemo(() => {
    if (!data) return []
    if (!filter) return data.dailyData
    return data.dailyData.filter((d) => d.date === filter)
  }, [data, filter])

  const filteredEarnings = filteredData.reduce((s, d) => s + d.earnings, 0)
  const filteredImpressions = filteredData.reduce((s, d) => s + d.impressions, 0)
  const filteredValid = filteredData.reduce((s, d) => s + (d.validClicks ?? d.impressions), 0)

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            Earnings History (IST)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Daily validated traffic &amp; next-day settlement breakdown in Asia/Kolkata (IST)
          </p>
        </div>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Balance</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-24" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              ${Number(data?.availableBalance ?? 0).toFixed(2)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Settled &amp; withdrawable</p>
        </div>

        <div className="bg-white border border-violet-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-4 w-4 text-violet-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Earnings</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-24" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              ${Number(data?.todayEarnings ?? 0).toFixed(4)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Settles tomorrow (IST)</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current CPM</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-20" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
              ${(data?.currentCpm ?? 0.5).toFixed(2)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Today&apos;s traffic score</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <MousePointerClick className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accrued</p>
          </div>
          {loading ? (
            <div className="h-8 bg-slate-200 rounded animate-pulse w-24" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              ${Number(data?.totalEarnings ?? 0).toFixed(2)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {(data?.totalImpressions ?? 0).toLocaleString()} impressions
          </p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white border border-slate-200 rounded-2xl p-4">
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">IST Date:</span>
        {[
          { label: 'All Days', value: '' },
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
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="text-xs text-slate-500 hover:text-slate-800 transition underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Date (IST)</th>
                <th className="px-6 py-4 text-right">Clicks</th>
                <th className="px-6 py-4 text-right">Valid Clicks</th>
                <th className="px-6 py-4 text-right">CPM Rate</th>
                <th className="px-6 py-4 text-center">Settlement</th>
                <th className="px-6 py-4 text-right">Earnings (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5" colSpan={6}><div className="h-4 bg-slate-200 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={6}>
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                      <span>No earnings data for the selected period</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredData.map((row) => {
                    const badge = settlementBadge(row.settlementStatus)
                    return (
                      <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">{formatDate(row.date)}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-700">{row.impressions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-700">{(row.validClicks ?? row.impressions).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                            ${row.cpmRate.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
                            <CheckCircle2 className="h-3 w-3" />
                            {badge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          ${row.earnings.toFixed(4)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-50 border-t-2 border-slate-300">
                    <td className="px-6 py-3 font-bold text-slate-700">
                      {filter ? formatDate(filter) : 'All Time'} Total
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">
                      {filteredImpressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">
                      {filteredValid.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-400">—</td>
                    <td className="px-6 py-3 text-center text-slate-400">—</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-blue-600">
                      ${filteredEarnings.toFixed(4)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse h-24" />
          ))
        ) : filteredData.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No earnings data for the selected period
          </div>
        ) : (
          filteredData.map((row) => {
            const badge = settlementBadge(row.settlementStatus)
            return (
              <div key={row.date} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{formatDate(row.date)}</span>
                  <span className="font-mono font-bold text-blue-600 text-base">${row.earnings.toFixed(4)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{row.impressions.toLocaleString()} clicks · ${row.cpmRate.toFixed(2)} CPM</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
        <strong>Next-Day Settlement Policy:</strong> Today&apos;s validated earnings accrue in real time and become available for withdrawal the next calendar day (IST). Payouts are processed daily between <strong>12:00 PM – 2:00 PM IST</strong> once your available balance reaches <strong>$15.00</strong>.
      </div>
    </div>
  )
}
