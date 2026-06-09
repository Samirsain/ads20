'use client'

import { useEffect, useState } from 'react'
import {
  Wallet,
  MousePointerClick,
  Users,
  Target,
  TrendingUp,
  RefreshCw,
  Award,
  ArrowUpRight,
} from 'lucide-react'

interface Earning {
  id: string
  externalUserId: string
  amount: string
  createdAt: string
  trafficLink: { uniqueCode: string; targetUrl: string }
}

interface DashboardData {
  walletBalance: string
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

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/traffic/dashboard')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch traffic statistics')
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Traffic Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time stats and performance metrics</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatCard
          title="Wallet Balance"
          value={`₹${Number(data?.walletBalance ?? 0).toFixed(2)}`}
          icon={Wallet}
          gradient="from-teal-600/20 to-emerald-600/5"
          border="border-teal-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Clicks"
          value={data?.totalClicks ?? 0}
          icon={MousePointerClick}
          gradient="from-blue-600/20 to-cyan-600/5"
          border="border-blue-500/20"
          loading={loading}
        />
        <StatCard
          title="Unique Clicks"
          value={data?.uniqueClicks ?? 0}
          icon={Users}
          gradient="from-indigo-600/20 to-violet-600/5"
          border="border-indigo-500/20"
          loading={loading}
        />
        <StatCard
          title="Conversions"
          value={data?.totalConversions ?? 0}
          icon={Target}
          gradient="from-orange-600/20 to-amber-600/5"
          border="border-orange-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Earned"
          value={`₹${Number(data?.totalEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          gradient="from-emerald-600/20 to-green-600/5"
          border="border-emerald-500/20"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Earnings */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-teal-500" />
            Recent Earnings
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                  <th className="px-4 py-3">External UID</th>
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
                ) : !data || data.recentEarnings.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      No earnings recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.recentEarnings.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-850/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {e.externalUserId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-teal-400">
                          {e.trafficLink.uniqueCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-400">
                        ₹{Number(e.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(e.createdAt).toLocaleDateString()} {new Date(e.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7 Days Performance Mini Chart/Stats */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-teal-500" />
            7 Days Activity
          </h3>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-800 rounded w-full" />
            </div>
          ) : !data || data.clicksLast7Days.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              No activity in the last 7 days.
            </div>
          ) : (
            <div className="space-y-3">
              {data.clicksLast7Days.map((day) => (
                <div key={day.date} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                  <span className="text-slate-400 text-sm">{day.date}</span>
                  <span className="text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded">
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
  icon: any
  gradient: string
  border: string
  loading: boolean
}

function StatCard({ title, value, icon: Icon, gradient, border, loading }: StatCardProps) {
  return (
    <div className={`bg-slate-900/30 backdrop-blur-md border border-slate-850 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-800 ${border}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[30px] opacity-45 pointer-events-none bg-gradient-to-br ${gradient}`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-800/80 rounded-lg animate-pulse mt-2" />
          ) : (
            <h4 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1 truncate">{value}</h4>
          )}
        </div>
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl">
          <Icon className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    </div>
  )
}
