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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">Platform overview and real-time statistics</p>
        </div>
        <button
          onClick={fetchStats}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Publishers"
          value={stats?.totalPublishers ?? 0}
          icon={Users}
          description="Registered publishers"
          gradient="from-blue-600/20 to-indigo-600/5"
          border="border-blue-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Traffic Users"
          value={stats?.totalTrafficUsers ?? 0}
          icon={Users}
          description="Traffic portal users"
          gradient="from-emerald-600/20 to-teal-600/5"
          border="border-emerald-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Clicks"
          value={stats?.totalClicks ?? 0}
          icon={MousePointerClick}
          description="Combined tracking link clicks"
          gradient="from-amber-600/20 to-orange-600/5"
          border="border-amber-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Conversions"
          value={stats?.totalConversions ?? 0}
          icon={ArrowRightLeft}
          description="Attributed registrations"
          gradient="from-purple-600/20 to-pink-600/5"
          border="border-purple-500/20"
          loading={loading}
        />
        <StatCard
          title="Publisher Payouts"
          value={`₹${Number(stats?.totalPubEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          description="Earned by publishers (₹0.05 / conversion)"
          gradient="from-sky-600/20 to-blue-600/5"
          border="border-sky-500/20"
          loading={loading}
        />
        <StatCard
          title="Traffic Payouts"
          value={`₹${Number(stats?.totalTrafficEarned ?? 0).toFixed(2)}`}
          icon={TrendingUp}
          description="Earned by traffic users (₹3.00 / conversion)"
          gradient="from-emerald-600/20 to-green-600/5"
          border="border-emerald-500/20"
          loading={loading}
        />
        <StatCard
          title="Pending Withdrawals"
          value={stats?.pendingWithdrawals ?? 0}
          icon={Clock}
          description="Awaiting approval"
          gradient="from-red-600/20 to-rose-600/5"
          border="border-red-500/20"
          loading={loading}
        />
        <StatCard
          title="Total Paid Out"
          value={`₹${Number(stats?.totalPaid ?? 0).toFixed(2)}`}
          icon={Wallet}
          description="Processed payout requests"
          gradient="from-violet-600/20 to-purple-600/5"
          border="border-violet-500/20"
          loading={loading}
        />
      </div>

      {/* Platform Info */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-500" />
          System Information
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed">
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
    <div className={`bg-slate-900/30 backdrop-blur-md border border-slate-850 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-slate-800 ${border}`}>
      {/* Background Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-40 pointer-events-none bg-gradient-to-br ${gradient}`} />

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
