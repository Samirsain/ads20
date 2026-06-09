'use client'

import { useEffect, useState } from 'react'
import { MousePointerClick, RefreshCw, Wallet, Link2, ExternalLink, Copy, Check } from 'lucide-react'
import StatCard from '@/components/StatCard'

interface DashboardData {
  totalClicks: number
  totalConversions: number
  walletBalance: number
  name: string
  email: string
  recentLinks: {
    id: string
    uniqueCode: string
    targetUrl: string
    clicks: number
    createdAt: string
    _count: { conversions: number }
  }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  useEffect(() => {
    fetch('/api/publisher/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${appUrl}/api/t/${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, {data?.name ?? 'Publisher'} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening with your traffic today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Clicks"
          value={data?.totalClicks ?? 0}
          icon={<MousePointerClick className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Total Conversions"
          value={data?.totalConversions ?? 0}
          icon={<RefreshCw className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Wallet Balance"
          value={(Number(data?.walletBalance ?? 0)).toFixed(2)}
          icon={<Wallet className="h-5 w-5" />}
          prefix="₹"
          color="purple"
        />
      </div>

      {/* Recent Links */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Recent Links</h2>
          <a href="/links" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all →
          </a>
        </div>

        {data?.recentLinks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Link2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No tracking links yet</p>
            <p className="mt-1 text-sm text-slate-400">Create your first link to start tracking</p>
            <a
              href="/links"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Link
            </a>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3.5 font-semibold text-slate-600">Tracking URL</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-600 hidden sm:table-cell">Clicks</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-600 hidden md:table-cell">Conversions</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-600">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {link.uniqueCode}
                        </span>
                        <a
                          href={link.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 truncate max-w-48">{link.targetUrl}</p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="font-semibold text-slate-700">{link.clicks}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="font-semibold text-emerald-600">{link._count.conversions}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => copyLink(link.uniqueCode)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                      >
                        {copiedCode === link.uniqueCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedCode === link.uniqueCode ? 'Copied!' : 'Copy'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
