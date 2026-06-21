'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  MousePointerClick,
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react'

interface Stats {
  totalPublishers: number
  totalTrafficUsers: number
  pubClicks: number
  trafficClicks: number
  totalClicks: number
  totalConversions: number
  totalPubEarned: number
  totalTrafficEarned: number
  pendingWithdrawals: number
  totalPaid: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch platform statistics')
      }
      setStats(data.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Platform overview and real-time statistics</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Publishers"
          value={stats?.totalPublishers ?? 0}
          icon={Users}
          description="Registered publishers"
          gradient="from-blue-500/10 to-indigo-500/5"
          border="border-blue-500/20"
          loading={loading}
        />
        <StatCard
          title="Traffic Users"
          value={stats?.totalTrafficUsers ?? 0}
          icon={Users}
          description="Traffic portal users"
          gradient="from-emerald-500/10 to-teal-500/5"
          border="border-emerald-500/20"
          loading={loading}
        />
        <StatCard
          title="Publisher Clicks"
          value={stats?.pubClicks ?? 0}
          icon={MousePointerClick}
          description="From publisher tracking links"
          gradient="from-amber-500/10 to-orange-500/5"
          border="border-amber-500/20"
          loading={loading}
        />
        <StatCard
          title="Traffic Clicks"
          value={stats?.trafficClicks ?? 0}
          icon={MousePointerClick}
          description="From traffic user links"
          gradient="from-cyan-500/10 to-sky-500/5"
          border="border-cyan-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Conversions"
          value={stats?.totalConversions ?? 0}
          icon={ArrowRightLeft}
          description="Attributed registrations"
          gradient="from-purple-500/10 to-pink-500/5"
          border="border-purple-500/20"
          loading={loading}
        />
        <StatCard
          title="Publisher Payouts"
          value={`$${Number(stats?.totalPubEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          description="$0.05 per conversion"
          gradient="from-sky-500/10 to-blue-500/5"
          border="border-sky-500/20"
          loading={loading}
        />
        <StatCard
          title="Traffic Payouts"
          value={`$${Number(stats?.totalTrafficEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          description="$3.00 per conversion"
          gradient="from-emerald-500/10 to-green-500/5"
          border="border-emerald-500/20"
          loading={loading}
        />
        <StatCard
          title="Pending Withdrawals"
          value={stats?.pendingWithdrawals ?? 0}
          icon={Clock}
          description="Awaiting approval"
          gradient="from-red-500/10 to-rose-500/5"
          border="border-red-500/20"
          loading={loading}
        />
      </div>

      {/* Total Paid Banner */}
      <div className="bg-white border border-violet-200 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-xl">
            <Wallet className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Paid Out</p>
            <p className="text-slate-400 text-xs mt-0.5">Processed payout requests (all time)</p>
          </div>
        </div>
        {loading ? (
          <div className="h-8 w-28 bg-slate-200 rounded-lg animate-pulse" />
        ) : (
          <span className="text-2xl font-bold text-slate-900 font-mono">${Number(stats?.totalPaid ?? 0).toFixed(2)}</span>
        )}
      </div>

      {/* Platform Info */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-600" />
          System Information
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed">
          Welcome to the Ads2Pub control center. Use this portal to track performance metrics across the system. 
          The landing page redirects traffic to the configured target URL, tracking visitor clicks and registrations 
          to credit publisher and traffic user wallets automatically via postback integration.
        </p>
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
      {/* Background Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-40 pointer-events-none bg-gradient-to-br ${gradient}`} />

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
