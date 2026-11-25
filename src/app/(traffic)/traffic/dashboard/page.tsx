'use client'

import { useEffect, useState, useCallback, type ComponentType } from 'react'
import Link from 'next/link'
import {
  Wallet,
  MousePointerClick,
  Users,
  Target,
  TrendingUp,
  RefreshCw,
  Award,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  CreditCard,
} from 'lucide-react'

interface Earning {
  id: string
  externalUserId: string
  amount: string
  createdAt: string
  trafficLink: { uniqueCode: string; targetUrl: string }
}

interface DashboardData {
  timezone: string
  todayDate: string
  yesterdayDate: string
  walletBalance: string
  availableBalance: number
  pendingPayment: number
  totalPaid: number
  todayClicks: number
  todayValidClicks: number
  todayEarnings: number
  yesterdayEarnings: number
  yesterdaySettlementStatus: string
  minWithdrawal: number
  canWithdraw: boolean
  shortfallToMin: number
  totalClicks: number
  uniqueClicks: number
  totalConversions: number
  totalEarned: number
  recentEarnings: Earning[]
  clicksLast7Days: { date: string; clicks: number }[]
}

export default function TrafficDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/traffic/dashboard')
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch traffic statistics')
    }
    return json.data as DashboardData
  }, [])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await loadDashboard()
      setData(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadDashboard])

  useEffect(() => {
    let active = true
    loadDashboard()
      .then((next) => { if (active) setData(next) })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadDashboard])

  const minW = data?.minWithdrawal ?? 15

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Traffic Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">
            IST real-time performance, next-day settlement &amp; payout tracking
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/traffic/withdraw"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-semibold shadow-sm transition"
          >
            <CreditCard className="h-4 w-4" />
            Withdraw
          </Link>
          <button
            onClick={() => void fetchDashboard()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Settlement & Payout Financial Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Available Balance"
          value={`$${Number(data?.availableBalance ?? data?.walletBalance ?? 0).toFixed(2)}`}
          subtext={
            data?.canWithdraw
              ? `Ready for payout (min $${minW.toFixed(2)})`
              : `$${Number(data?.shortfallToMin ?? minW).toFixed(2)} more to reach $${minW.toFixed(2)} min`
          }
          icon={Wallet}
          accent="border-teal-200 bg-teal-50 text-teal-700"
          loading={loading}
        />
        <StatCard
          title="Today's Earnings (IST)"
          value={`$${Number(data?.todayEarnings ?? 0).toFixed(2)}`}
          subtext={`${data?.todayClicks ?? 0} clicks today · settles next day IST`}
          icon={Clock}
          accent="border-amber-200 bg-amber-50 text-amber-700"
          loading={loading}
        />
        <StatCard
          title="Yesterday's Earnings"
          value={`$${Number(data?.yesterdayEarnings ?? 0).toFixed(2)}`}
          subtext={
            data?.yesterdaySettlementStatus === 'SETTLED'
              ? 'Settled to Available Balance'
              : 'Pending daily settlement'
          }
          icon={CheckCircle2}
          accent="border-emerald-200 bg-emerald-50 text-emerald-700"
          loading={loading}
        />
        <StatCard
          title="Pending / Total Paid"
          value={`$${Number(data?.pendingPayment ?? 0).toFixed(2)}`}
          subtext={`Total Paid: $${Number(data?.totalPaid ?? 0).toFixed(2)} · Window 12–2 PM IST`}
          icon={TrendingUp}
          accent="border-blue-200 bg-blue-50 text-blue-700"
          loading={loading}
        />
      </div>

      {/* Traffic Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clicks"
          value={(data?.totalClicks ?? 0).toLocaleString()}
          icon={MousePointerClick}
          accent="border-slate-200 bg-slate-50 text-slate-700"
          loading={loading}
        />
        <StatCard
          title="Unique Clicks"
          value={(data?.uniqueClicks ?? 0).toLocaleString()}
          icon={Users}
          accent="border-sky-200 bg-sky-50 text-sky-700"
          loading={loading}
        />
        <StatCard
          title="Conversions"
          value={(data?.totalConversions ?? 0).toLocaleString()}
          icon={Target}
          accent="border-amber-200 bg-amber-50 text-amber-700"
          loading={loading}
        />
        <StatCard
          title="Lifetime Earned"
          value={`$${Number(data?.totalEarned ?? 0).toFixed(2)}`}
          icon={Award}
          accent="border-emerald-200 bg-emerald-50 text-emerald-700"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Earnings */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-teal-500" />
            Recent Earnings
          </h3>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">External UID</th>
                  <th className="px-4 py-3">Link Code</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4" colSpan={4}><div className="h-4 bg-slate-200 rounded w-full" /></td>
                    </tr>
                  ))
                ) : !data || data.recentEarnings.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={4}>No earnings recorded yet.</td></tr>
                ) : data.recentEarnings.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.externalUserId}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-teal-600 text-xs">{e.trafficLink.uniqueCode}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-600">${Number(e.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />
              ))
            ) : !data || data.recentEarnings.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No earnings recorded yet.</p>
            ) : data.recentEarnings.map((e) => (
              <div key={e.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-teal-600 text-xs">{e.trafficLink.uniqueCode}</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">${Number(e.amount).toFixed(2)}</span>
                  </div>
                  <p className="font-mono text-xs text-slate-400 truncate">{e.externalUserId}</p>
                </div>
                <span className="text-slate-400 text-xs shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7 Days Performance Mini Chart/Stats */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-teal-500" />
            7 Days Activity
          </h3>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-200 rounded w-full" />
            </div>
          ) : !data || data.clicksLast7Days.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              No activity in the last 7 days.
            </div>
          ) : (
            <div className="space-y-3">
              {data.clicksLast7Days.map((day) => (
                <div key={day.date} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-slate-500 text-sm">{day.date}</span>
                  <span className="text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">
                    {day.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon: ComponentType<{ className?: string }>
  accent: string
  loading: boolean
}

function StatCard({ title, value, subtext, icon: Icon, accent, loading }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse mt-2" />
          ) : (
            <h4 className="text-xl lg:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-1 truncate">
              {value}
            </h4>
          )}
          {subtext && !loading && (
            <p className="text-xs text-slate-500 mt-1.5 leading-snug">{subtext}</p>
          )}
        </div>
        <div className={`p-2.5 border rounded-xl shrink-0 ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
