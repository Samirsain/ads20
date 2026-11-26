'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe,
  MousePointerClick,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react'

export interface LinkAnalyticsPayload {
  portal: 'publisher' | 'traffic'
  timezone: string
  link: {
    id: string
    name: string
    uniqueCode: string
    trackingUrl: string
    targetUrl: string
    linkType: string
    isActive: boolean
    isDeleted?: boolean
    createdAt: string
    owner?: { id: string; name: string; email: string }
  }
  metrics: {
    totalClicks: number
    uniqueClicks?: number
    todayClicks: number
    yesterdayClicks: number
    totalEarnings: number
    cpmRate?: number
    totalConversions?: number
  }
  countryStats: Array<{ country: string; clicks: number; percentage: number }>
  dailySeries: Array<{
    date: string
    clicks: number
    rawClicks?: number
    uniqueClicks?: number
    earnings: number
    conversions?: number
  }>
}

interface LinkAnalyticsViewProps {
  data: LinkAnalyticsPayload | null
  loading: boolean
  error: string
  backHref: string
  backLabel: string
  onRefresh: () => void
}

export default function LinkAnalyticsView({
  data,
  loading,
  error,
  backHref,
  backLabel,
  onRefresh,
}: LinkAnalyticsViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!data?.link.trackingUrl) return
    void navigator.clipboard.writeText(data.link.trackingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maxDailyClicks = Math.max(
    1,
    ...(data?.dailySeries.map((d) => d.clicks) ?? [1])
  )

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#101828] hover:text-[#155EEF] transition self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition disabled:opacity-50 self-start sm:self-auto"
        >
          <BarChart3 className="h-4 w-4 text-[#155EEF]" />
          Refresh Analytics
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Header Metadata Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        {loading || !data ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-7 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight truncate">
                  {data.link.name}
                </h1>
                <span className="font-mono text-xs bg-blue-50 text-[#155EEF] border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {data.link.uniqueCode}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    data.link.isActive && !data.link.isDeleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {data.link.isDeleted ? 'Deleted' : data.link.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>

              {data.link.owner && (
                <p className="text-xs text-slate-500">
                  Owner: <span className="font-semibold text-[#101828]">{data.link.owner.name}</span> ({data.link.owner.email})
                </p>
              )}

              <p className="text-xs text-slate-500 truncate">
                Destination:{' '}
                <span className="font-mono text-slate-700">{data.link.targetUrl}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[#155EEF] truncate max-w-full">
                  {data.link.trackingUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white text-xs font-semibold shadow-xs hover:opacity-95 transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={data.link.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </div>
            </div>

            <div className="text-xs text-slate-500 shrink-0 lg:text-right space-y-1">
              <div className="flex items-center lg:justify-end gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Created {new Date(data.link.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-slate-400">Timezone: {data.timezone}</p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Clicks"
          value={(data?.metrics.totalClicks ?? 0).toLocaleString()}
          icon={MousePointerClick}
          tone="text-[#155EEF] bg-blue-50 border-blue-200"
          loading={loading}
        />
        <MetricCard
          label="Today's Clicks (IST)"
          value={(data?.metrics.todayClicks ?? 0).toLocaleString()}
          icon={Clock}
          tone="text-cyan-700 bg-cyan-50 border-cyan-200"
          loading={loading}
        />
        <MetricCard
          label="Yesterday's Clicks"
          value={(data?.metrics.yesterdayClicks ?? 0).toLocaleString()}
          icon={TrendingUp}
          tone="text-slate-700 bg-slate-100 border-slate-200"
          loading={loading}
        />
        <MetricCard
          label="Total Earnings"
          value={`$${Number(data?.metrics.totalEarnings ?? 0).toFixed(4)}`}
          subtext={
            data?.metrics.totalConversions !== undefined
              ? `${data.metrics.totalConversions.toLocaleString()} conversions`
              : data?.metrics.cpmRate !== undefined
              ? `eCPM $${data.metrics.cpmRate.toFixed(2)}`
              : undefined
          }
          icon={DollarSign}
          tone="text-emerald-700 bg-emerald-50 border-emerald-200"
          loading={loading}
        />
      </div>

      {/* Chart + Country Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 14-Day Clicks & Earnings Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#155EEF]" />
                Date-Wise Clicks (Last 14 Days)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">IST daily click volume &amp; earnings performance</p>
            </div>
          </div>

          {loading || !data ? (
            <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-4">
              {data.dailySeries
                .slice(0, 14)
                .reverse()
                .map((day) => {
                  const pct = Math.max(4, Math.round((day.clicks / maxDailyClicks) * 100))
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full group"
                      title={`${day.date}: ${day.clicks} clicks · $${day.earnings.toFixed(4)}`}
                    >
                      <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition">
                        {day.clicks}
                      </span>
                      <div
                        className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-[#155EEF] to-[#06B6D4] transition-all duration-300"
                        style={{ height: `${day.clicks === 0 ? 4 : pct}%` }}
                      />
                      <span className="text-[10px] font-mono text-slate-400">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Country-Wise Clicks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#06B6D4]" />
            Country-Wise Clicks
          </h2>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : !data || data.countryStats.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No click geo data recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.countryStats.map((c) => (
                <div key={c.country} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#101828]">{c.country}</span>
                    <span className="font-mono text-slate-600">
                      {c.clicks.toLocaleString()} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#155EEF] to-[#06B6D4]"
                      style={{ width: `${Math.max(4, c.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Earning & Clicks Report */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="font-bold text-[#101828] text-sm uppercase tracking-wide flex items-center gap-2">
            <Target className="h-4 w-4 text-[#155EEF]" />
            Daily Earning Report (IST)
          </h2>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-[#F8FAFC]">
                <th className="px-6 py-3.5">IST Date</th>
                <th className="px-6 py-3.5 text-right">Clicks</th>
                {data?.dailySeries.some((d) => d.conversions !== undefined) && (
                  <th className="px-6 py-3.5 text-right">Conversions</th>
                )}
                <th className="px-6 py-3.5 text-right">Daily Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : !data || data.dailySeries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">No daily data recorded yet.</td>
                </tr>
              ) : (
                data.dailySeries.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs text-[#101828] font-medium">{row.date}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-800">{row.clicks.toLocaleString()}</td>
                    {row.conversions !== undefined && (
                      <td className="px-6 py-3.5 text-right font-mono text-cyan-700">{row.conversions.toLocaleString()}</td>
                    )}
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-[#155EEF]">
                      ${row.earnings.toFixed(4)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-200">
          {!loading &&
            data?.dailySeries.map((row) => (
              <div key={row.date} className="p-4 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-mono text-xs font-semibold text-[#101828]">{row.date}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.clicks.toLocaleString()} clicks</p>
                </div>
                <p className="font-mono font-bold text-[#155EEF]">${row.earnings.toFixed(4)}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone,
  loading,
}: {
  label: string
  value: string
  subtext?: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  loading: boolean
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="h-7 w-20 bg-slate-200 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#101828] mt-1 truncate">
              {value}
            </p>
          )}
          {subtext && !loading && (
            <p className="text-xs text-slate-500 mt-1 truncate">{subtext}</p>
          )}
        </div>
        <div className={`p-2 rounded-xl border shrink-0 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

