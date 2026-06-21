'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'

interface Earning {
  id: string
  externalUserId: string
  amount: string
  createdAt: string
  trafficLink: { uniqueCode: string; targetUrl: string }
}

export default function TrafficEarningsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEarnings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/traffic/earnings')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load earnings')
      }
      setEarnings(json.data.earnings || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-teal-500" />
            Earnings History
          </h1>
          <p className="text-slate-500 mt-1">Detailed breakdown of all your credited conversions</p>
        </div>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Conversion ID / Ext UID</th>
                <th className="px-6 py-4">Link Code</th>
                <th className="px-6 py-4">Reward Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={5}>
                      <div className="h-5 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : earnings.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={5}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                      <span>No earnings recorded yet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-mono text-xs text-slate-500">{earning.id}</div>
                        <div className="text-slate-900 font-medium mt-1">UID: {earning.externalUserId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-teal-600 text-xs">
                        {earning.trafficLink.uniqueCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-emerald-600">
                      ${Number(earning.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
                        <CheckCircle className="h-3 w-3" /> CREDITED
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {new Date(earning.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
