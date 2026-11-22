'use client'

import { useEffect, useState } from 'react'
import {
  Wallet,
  MousePointerClick,
  BarChart2,
  TrendingUp,
  RefreshCw,
  Award,
  Link2,
} from 'lucide-react'

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
  totalImpressions: number
  currentCpm: number
  todayEarnings: number
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
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch publisher statistics')
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Publisher Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time impressions and CPM performance overview</p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Wallet Balance"
          value={`$${Number(data?.walletBalance ?? 0).toFixed(2)}`}
          icon={Wallet}
          description="Available for withdrawal"
          gradient="from-blue-500/10 to-indigo-500/5"
          border="border-blue-200"
          loading={loading}
        />
        <StatCard
          title="Total Impressions"
          value={(data?.totalImpressions ?? 0).toLocaleString()}
          icon={MousePointerClick}
          description="All-time link impressions"
          gradient="from-amber-500/10 to-orange-500/5"
          border="border-amber-200"
          loading={loading}
        />
        <StatCard
          title="CPM Rate (Today)"
          value={`$${(data?.currentCpm ?? 0.5).toFixed(2)}`}
          icon={BarChart2}
          description="Per 1,000 impressions today"
          gradient="from-emerald-500/10 to-teal-500/5"
          border="border-emerald-200"
          loading={loading}
        />
        <StatCard
          title="Today's Earnings"
          value={`$${(data?.todayEarnings ?? 0).toFixed(4)}`}
          icon={TrendingUp}
          description="CPM earnings for today"
          gradient="from-purple-500/10 to-pink-500/5"
          border="border-purple-200"
          loading={loading}
        />
      </div>

      <div className="max-w-xl">
        {/* Top Performing Link */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Top Link
          </h3>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-12 bg-slate-200 rounded" />
            </div>
          ) : !data || !data.topLink ? (
            <div className="text-slate-400 text-center py-8">
              <Link2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              No links created yet.
            </div>
          ) : (
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[30px] opacity-10 bg-amber-500" />
              <div>
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Most Traffic
                </span>
                <h4 className="text-slate-900 font-mono font-bold mt-3 text-base">
                  Code: {data.topLink.uniqueCode}
                </h4>
                <p className="text-slate-500 text-xs truncate mt-1">
                  Target: {data.topLink.targetUrl}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Impressions</span>
                  <div className="text-slate-900 font-bold text-lg mt-0.5">{data.topLink.clicks.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Type</span>
                  <div className="text-slate-900 font-bold text-sm mt-1 uppercase tracking-wide">
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
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-300 ${border}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-45 pointer-events-none bg-gradient-to-br ${gradient}`} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-200 rounded-lg animate-pulse mt-2" />
          ) : (
            <h4 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-1">{value}</h4>
          )}
          <p className="text-slate-400 text-xs font-medium mt-2">{description}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </div>
  )
}
