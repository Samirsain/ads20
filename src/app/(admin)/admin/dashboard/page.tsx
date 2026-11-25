'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  MousePointerClick,
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  Clock,
  Shield,
  RefreshCw,
  CalendarRange,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react'

interface Stats {
  timezone: string
  today: string
  payoutWindow: { active: boolean; currentIstTime: string; windowLabel: string }
  totalPublishers: number
  totalTrafficUsers: number
  pubClicks: number
  trafficClicks: number
  totalClicks: number
  todayClicks: number
  todayEarned: number
  totalConversions: number
  totalPubEarned: number
  totalTrafficEarned: number
  pendingWithdrawals: number
  approvedWithdrawals: number
  totalAvailableBalances: number
  totalReservedBalances: number
  totalPaid: number
  unsettledHistoricalRecords: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch platform statistics')
    }
    return data.data as Stats
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStats(await loadStats())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadStats])

  useEffect(() => {
    let active = true
    loadStats()
      .then((d) => { if (active) setStats(d) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Something went wrong') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadStats])

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Platform overview ({stats?.today ?? 'IST'}) · Daily payout window: {stats?.payoutWindow?.windowLabel ?? '12:00 PM – 2:00 PM IST'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {(stats?.unsettledHistoricalRecords ?? 0) > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              <strong>{stats?.unsettledHistoricalRecords}</strong> historical validated conversion(s) are pending next-day IST settlement.
            </span>
          </div>
          <Link
            href="/admin/settlement"
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shrink-0 self-start sm:self-auto"
          >
            Open Settlement &amp; Payout Batch
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatCard
          title="Publishers"
          value={stats?.totalPublishers ?? 0}
          icon={Users}
          description="Registered publishers"
          border="border-blue-500/20"
          loading={loading}
        />
        <StatCard
          title="Traffic Users"
          value={stats?.totalTrafficUsers ?? 0}
          icon={Users}
          description="Traffic portal users"
          border="border-emerald-500/20"
          loading={loading}
        />
        <StatCard
          title="Today's Clicks (IST)"
          value={(stats?.todayClicks ?? 0).toLocaleString()}
          icon={MousePointerClick}
          description={`All time: ${(stats?.totalClicks ?? 0).toLocaleString()}`}
          border="border-amber-500/20"
          loading={loading}
        />
        <StatCard
          title="Today's Earnings (IST)"
          value={`$${Number(stats?.todayEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          description="Settles next calendar day"
          border="border-violet-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Conversions"
          value={stats?.totalConversions ?? 0}
          icon={ArrowRightLeft}
          description="Attributed registrations"
          border="border-purple-500/20"
          loading={loading}
        />
        <StatCard
          title="Available Balances"
          value={`$${Number(stats?.totalAvailableBalances ?? 0).toFixed(2)}`}
          icon={Wallet}
          description={`Reserved: $${Number(stats?.totalReservedBalances ?? 0).toFixed(2)}`}
          border="border-sky-500/20"
          loading={loading}
        />
        <StatCard
          title="Pending / Approved"
          value={`${stats?.pendingWithdrawals ?? 0} / ${stats?.approvedWithdrawals ?? 0}`}
          icon={Clock}
          description="Awaiting approval / batch"
          border="border-red-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Paid Out"
          value={`$${Number(stats?.totalPaid ?? 0).toFixed(2)}`}
          icon={Wallet}
          description="Confirmed payouts sent"
          border="border-emerald-500/20"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/reports"
          className="bg-white border border-slate-200 hover:border-violet-300 rounded-2xl p-5 flex items-start gap-3 transition"
        >
          <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600"><CalendarRange className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Date-Wise Traffic Reports</h3>
            <p className="text-xs text-slate-500 mt-1">Filter IST dates, review publisher totals &amp; safely archive cleared days.</p>
          </div>
        </Link>
        <Link
          href="/admin/settlement"
          className="bg-white border border-slate-200 hover:border-violet-300 rounded-2xl p-5 flex items-start gap-3 transition"
        >
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><CalendarClock className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Next-Day Settlement &amp; Batch</h3>
            <p className="text-xs text-slate-500 mt-1">Settle prior IST days and run daily 12–2 PM IST payout batches.</p>
          </div>
        </Link>
        <Link
          href="/admin/withdrawals"
          className="bg-white border border-slate-200 hover:border-violet-300 rounded-2xl p-5 flex items-start gap-3 transition"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Wallet className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Manage Withdrawals</h3>
            <p className="text-xs text-slate-500 mt-1">Approve, mark Paid with TxRef, reject, or reconcile uncertain payouts.</p>
          </div>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-600" />
          System Information
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed">
          Ads2Pub operates on Asia/Kolkata (IST) day boundaries with a $15.00 USD minimum withdrawal, next-day earnings settlement, and daily 12:00 PM–2:00 PM IST payout batch processing. Clearing historical traffic reports archives report visibility after SHA-256 backup verification while keeping financial ledgers and deduplication keys untouched.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  border,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description: string
  border: string
  loading: boolean
}) {
  return (
    <div className={`bg-white border rounded-2xl p-5 transition-all duration-200 hover:shadow-sm ${border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse mt-2" />
          ) : (
            <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 font-mono truncate">{value}</h4>
          )}
          <p className="text-slate-400 text-xs font-medium mt-1.5 truncate">{description}</p>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
      </div>
    </div>
  )
}
