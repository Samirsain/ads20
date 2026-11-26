'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Wallet,
  MousePointerClick,
  BarChart2,
  TrendingUp,
  RefreshCw,
  Award,
  Link2,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  CalendarClock,
  Sparkles,
  BarChart3,
} from 'lucide-react'

interface TrackingLink {
  id: string
  name?: string
  uniqueCode: string
  targetUrl: string
  linkType: string
  clicks: number
  createdAt: string
}

interface RecentPayout {
  id: string
  amount: string
  network: string
  status: string
  txReference: string | null
  requestedAt: string
}

interface PayoutWindow {
  active: boolean
  timezone: string
  today: string
  nextBatchDate: string
  currentIstTime: string
  windowLabel: string
}

interface DailyPoint {
  date: string
  clicks: number
  earnings: number
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
  totalEarnings: number
  totalActiveLinks: number
  minWithdrawal: number
  canWithdraw: boolean
  shortfallToMin: number
  payoutWindow: PayoutWindow
  totalImpressions: number
  currentCpm: number
  topLink: TrackingLink | null
  recentPayouts: RecentPayout[]
  dailySeries?: DailyPoint[]
}

function settlementLabel(status: string) {
  switch (status) {
    case 'SETTLED':
    case 'LEGACY_SETTLED':
      return { text: 'Settled', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'PENDING_SETTLEMENT':
      return { text: 'Pending settlement', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'EXCEPTION':
      return { text: 'Under review', cls: 'bg-red-50 text-red-700 border-red-200' }
    default:
      return { text: 'No activity', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  }
}

export default function PublisherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/publisher/dashboard')
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch publisher statistics')
    return json.data as DashboardData
  }, [])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadDashboard())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadDashboard])

  useEffect(() => {
    let active = true
    loadDashboard()
      .then((d) => { if (active) setData(d) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Something went wrong') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadDashboard])

  const minW = data?.minWithdrawal ?? 15
  const avail = data?.availableBalance ?? 0
  const progressPct = Math.min(100, Math.round((avail / minW) * 100))
  const yBadge = settlementLabel(data?.yesterdaySettlementStatus ?? 'NONE')
  const series = data?.dailySeries ?? []
  const maxChartClicks = Math.max(1, ...series.map((s) => s.clicks))

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight">
            Publisher Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time IST traffic analytics, link performance, and daily payouts
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[#101828] hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/publisher/links"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-[#155EEF] hover:bg-blue-50 text-sm font-semibold transition active:scale-95"
          >
            <Link2 className="h-4 w-4" />
            My Links
          </Link>
          <Link
            href="/publisher/withdraw"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] hover:opacity-95 text-white text-sm font-semibold shadow-sm transition active:scale-95"
          >
            Withdraw
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="underline font-semibold shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Daily Payments Available Notice */}
      <div className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#155EEF] to-[#06B6D4] px-3 py-1 text-xs font-semibold text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Daily Payments Available
              </span>
              {data?.payoutWindow && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    data.payoutWindow.active
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-600'
                  }`}
                >
                  <CalendarClock className="h-3.5 w-3.5 text-[#155EEF]" />
                  {data.payoutWindow.active
                    ? `Payout window open now (${data.payoutWindow.currentIstTime} IST)`
                    : `Next window: ${data.payoutWindow.windowLabel}`}
                </span>
              )}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#155EEF] shrink-0" />
                <span>Minimum withdrawal: <strong>${minW.toFixed(2)} USD</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#06B6D4] shrink-0" />
                <span>Daily payout window: <strong>12 PM–2 PM IST</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#155EEF] shrink-0" />
                <span>Today&apos;s traffic settles next day IST</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#06B6D4] shrink-0" />
                <span>Unlimited named links &amp; geo analytics</span>
              </li>
            </ul>
          </div>

          {/* $15 Threshold Progress */}
          <div className="w-full lg:w-72 shrink-0 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#101828]">Withdrawal Threshold (${minW.toFixed(2)})</span>
              <span className="font-mono font-bold text-[#155EEF]">{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data?.canWithdraw
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-[#155EEF] to-[#06B6D4]'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {loading ? (
                'Checking settled balance...'
              ) : data?.canWithdraw ? (
                <span className="text-emerald-700 font-medium">
                  Eligible now! ${avail.toFixed(2)} ready to withdraw.
                </span>
              ) : (
                <span>
                  <strong>${(data?.shortfallToMin ?? minW).toFixed(2)}</strong> more needed in settled balance.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Core PRD 7+ KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Available Balance"
          value={`$${avail.toFixed(2)}`}
          icon={Wallet}
          description="Settled balance ready to withdraw"
          accent="border-blue-200"
          loading={loading}
        />
        <StatCard
          title="Pending Withdrawal"
          value={`$${(data?.pendingPayment ?? 0).toFixed(2)}`}
          icon={Clock}
          description="Reserved in active requests"
          accent="border-amber-200"
          loading={loading}
        />
        <StatCard
          title="Total Earnings"
          value={`$${(data?.totalEarnings ?? 0).toFixed(2)}`}
          icon={ShieldCheck}
          description={`Total Paid: $${(data?.totalPaid ?? 0).toFixed(2)}`}
          accent="border-emerald-200"
          loading={loading}
        />
        <StatCard
          title="Today's Earnings"
          value={`$${(data?.todayEarnings ?? 0).toFixed(4)}`}
          icon={TrendingUp}
          description={`${data?.todayDate ?? 'Today'} IST · settles tomorrow`}
          accent="border-cyan-200"
          loading={loading}
        />
        <StatCard
          title="Total Clicks"
          value={(data?.totalImpressions ?? 0).toLocaleString()}
          icon={MousePointerClick}
          description="All-time clicks across links"
          accent="border-slate-200"
          loading={loading}
        />
        <StatCard
          title="Today's Clicks"
          value={(data?.todayClicks ?? 0).toLocaleString()}
          icon={CheckCircle2}
          description={`Valid today: ${(data?.todayValidClicks ?? 0).toLocaleString()}`}
          accent="border-slate-200"
          loading={loading}
        />
        <StatCard
          title="Total Active Links"
          value={(data?.totalActiveLinks ?? 0).toLocaleString()}
          icon={Link2}
          description={`eCPM today: $${(data?.currentCpm ?? 0.5).toFixed(2)}`}
          accent="border-slate-200"
          loading={loading}
        />
        <StatCard
          title="Yesterday's Earnings"
          value={`$${(data?.yesterdayEarnings ?? 0).toFixed(4)}`}
          icon={BarChart2}
          description={`${data?.yesterdayDate ?? 'Yesterday'} IST`}
          badge={data ? { text: yBadge.text, cls: yBadge.cls } : undefined}
          accent="border-slate-200"
          loading={loading}
        />
      </div>

      {/* 7-Day Performance Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#155EEF]" />
              7-Day Traffic &amp; Earnings Analytics (IST)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Daily valid clicks and accrued earnings</p>
          </div>
          <Link
            href="/publisher/earnings"
            className="text-xs font-semibold text-[#155EEF] hover:underline self-start sm:self-auto"
          >
            Full Earnings Report →
          </Link>
        </div>

        {loading ? (
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
        ) : series.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-slate-400">
            No traffic activity in the last 7 days yet.
          </div>
        ) : (
          <div className="h-44 flex items-end gap-2 sm:gap-4 pt-4">
            {series.map((pt) => {
              const pct = Math.max(5, Math.round((pt.clicks / maxChartClicks) * 100))
              return (
                <div
                  key={pt.date}
                  className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full group"
                  title={`${pt.date}: ${pt.clicks} clicks · $${pt.earnings.toFixed(4)}`}
                >
                  <span className="text-[11px] font-mono text-[#101828] font-semibold">
                    {pt.clicks}
                  </span>
                  <div
                    className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-[#155EEF] to-[#06B6D4] transition-all duration-300"
                    style={{ height: `${pt.clicks === 0 ? 5 : pct}%` }}
                  />
                  <span className="text-[11px] font-mono text-slate-500">{pt.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Panels: Top Link + Recent Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Link */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#101828] flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Performing Link
            </h3>
            <Link href="/publisher/links" className="text-xs font-semibold text-[#155EEF] hover:underline">
              Manage Links
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-16 bg-slate-200 rounded-xl" />
            </div>
          ) : !data || !data.topLink ? (
            <div className="text-slate-400 text-center py-8">
              <Link2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm">No links created yet.</p>
            </div>
          ) : (
            <div className="space-y-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#155EEF] uppercase tracking-wider bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                  Most Traffic
                </span>
                <span className="text-xs font-mono text-slate-500">{data.topLink.uniqueCode}</span>
              </div>
              <div>
                <Link
                  href={`/publisher/links/${data.topLink.id}`}
                  className="text-[#101828] hover:text-[#155EEF] font-bold text-base transition"
                >
                  {data.topLink.name || data.topLink.uniqueCode}
                </Link>
                <p className="text-slate-500 text-xs truncate mt-1">{data.topLink.targetUrl}</p>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Total Clicks</span>
                <span className="text-[#101828] font-bold text-lg font-mono">
                  {data.topLink.clicks.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Payment History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#101828] flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#155EEF]" />
              Payment History
            </h3>
            <Link href="/publisher/withdraw" className="text-xs font-semibold text-[#155EEF] hover:underline">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-14 bg-slate-200 rounded-xl" />
              <div className="h-14 bg-slate-200 rounded-xl" />
            </div>
          ) : !data || data.recentPayouts.length === 0 ? (
            <div className="text-slate-400 text-center py-8 text-sm">
              No withdrawal requests yet. Minimum withdrawal is ${minW.toFixed(2)}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.recentPayouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#101828] text-sm">
                        ${Number(p.amount).toFixed(2)}
                      </span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {p.network}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {new Date(p.requestedAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {p.txReference ? ` · Ref: ${p.txReference}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
    PROCESSING: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    UNCERTAIN: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${styles[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description: string
  accent: string
  loading: boolean
  badge?: { text: string; cls: string }
}

function StatCard({ title, value, icon: Icon, description, accent, loading, badge }: StatCardProps) {
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-sm ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse mt-2" />
          ) : (
            <h4 className="text-2xl font-bold text-[#101828] tracking-tight mt-1 font-mono tabular-nums truncate">{value}</h4>
          )}
        </div>
        <div className="p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl shrink-0">
          <Icon className="h-4 w-4 text-[#155EEF]" />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-slate-400 text-xs truncate">{description}</p>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  )
}
