'use client'

import { useEffect, useState } from 'react'
import {
  Wallet,
  MousePointerClick,
  ArrowRightLeft,
  TrendingUp,
  RefreshCw,
  Award,
  Link2,
} from 'lucide-react'

interface Conversion {
  id: string
  externalUserId: string
  amount: string
  status: string
  createdAt: string
  trackingLink: { uniqueCode: string; targetUrl: string }
}

interface TrackingLink {
  id: string
  uniqueCode: string
  targetUrl: string
  linkType: string
  clicks: number
  createdAt: string
}

interface DashboardData {
  walletBalance: string
  totalClicks: number
  totalConversions: number
  totalEarned: number
  recentConversions: Conversion[]
  topLink: TrackingLink | null
}

export default function PublisherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/publisher/dashboard')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch publisher statistics')
      }
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Publisher Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time stats and monetized link performance</p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Wallet Balance"
          value={`₹${Number(data?.walletBalance ?? 0).toFixed(2)}`}
          icon={Wallet}
          description="Available for withdrawal"
          gradient="from-blue-600/20 to-indigo-600/5"
          border="border-blue-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Clicks"
          value={data?.totalClicks ?? 0}
          icon={MousePointerClick}
          description="Total link clicks recorded"
          gradient="from-amber-600/20 to-orange-600/5"
          border="border-amber-500/20"
          loading={loading}
        />
        <StatCard
          title="Conversions"
          value={data?.totalConversions ?? 0}
          icon={ArrowRightLeft}
          description="Attributed signups"
          gradient="from-emerald-600/20 to-teal-600/5"
          border="border-emerald-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Earned"
          value={`₹${Number(data?.totalEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          description="All-time system earnings"
          gradient="from-purple-600/20 to-pink-600/5"
          border="border-purple-500/20"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Conversions */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            Recent Conversions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                  <th className="px-4 py-3">Conversion ID / External UID</th>
                  <th className="px-4 py-3">Link Code</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
                {loading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-4" colSpan={4}>
                        <div className="h-4 bg-slate-800/60 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : !data || data.recentConversions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      No conversions recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.recentConversions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-850/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {c.externalUserId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-blue-400">
                          {c.trackingLink.uniqueCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-400">
                        ₹{Number(c.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing Link */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Top Link
          </h3>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-12 bg-slate-800 rounded" />
            </div>
          ) : !data || !data.topLink ? (
            <div className="text-slate-500 text-center py-8">
              <Link2 className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              No links created yet.
            </div>
          ) : (
            <div className="space-y-4 bg-slate-950/40 border border-slate-850 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[30px] opacity-10 bg-amber-500" />
              <div>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded-md">
                  Most Popular
                </span>
                <h4 className="text-white font-mono font-bold mt-3 text-base">
                  Code: {data.topLink.uniqueCode}
                </h4>
                <p className="text-slate-400 text-xs truncate mt-1">
                  Target: {data.topLink.targetUrl}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-850 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Clicks</span>
                  <div className="text-white font-bold text-lg mt-0.5">{data.topLink.clicks}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Type</span>
                  <div className="text-white font-bold text-sm mt-1 uppercase tracking-wide">
                    {data.topLink.linkType}
                  </div>
                </div>
              </div>
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
  icon: any
  description: string
  gradient: string
  border: string
  loading: boolean
}

function StatCard({ title, value, icon: Icon, description, gradient, border, loading }: StatCardProps) {
  return (
    <div className={`bg-slate-900/30 backdrop-blur-md border border-slate-850 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-800 ${border}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-45 pointer-events-none bg-gradient-to-br ${gradient}`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-800/80 rounded-lg animate-pulse mt-2" />
          ) : (
            <h4 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">{value}</h4>
          )}
          <p className="text-slate-500 text-xs font-medium mt-2">{description}</p>
        </div>
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
          <Icon className="h-5 w-5 text-slate-300" />
        </div>
      </div>
    </div>
  )
}
