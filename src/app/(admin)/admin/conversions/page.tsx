'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, RefreshCw, Activity } from 'lucide-react'

interface Conversion {
  id: string
  externalUserId: string
  amount: string
  status: string
  createdAt: string
  publisher: { name: string; email: string }
  trackingLink: { uniqueCode: string }
}

export default function AdminConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchConversions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/conversions')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch conversions')
      }
      setConversions(data.data.conversions || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversions()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-violet-500" />
            Conversions
          </h1>
          <p className="text-slate-400 mt-1">View all publisher conversions globally</p>
        </div>
        <button
          onClick={fetchConversions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-6 py-4">Conversion ID</th>
                <th className="px-6 py-4">Publisher</th>
                <th className="px-6 py-4">Link Code</th>
                <th className="px-6 py-4">External UID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={7}>
                      <div className="h-5 bg-slate-800/60 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : conversions.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-600" />
                      <span>No conversions found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                conversions.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{conv.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{conv.publisher?.name || 'N/A'}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{conv.publisher?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{conv.trackingLink?.uniqueCode || 'N/A'}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{conv.externalUserId}</td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-100">
                      ₹{Number(conv.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> {conv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 text-xs">
                      {new Date(conv.createdAt).toLocaleString()}
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
