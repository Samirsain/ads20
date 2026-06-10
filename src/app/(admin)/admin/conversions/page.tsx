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
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch conversions')
      setConversions(data.data.conversions || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConversions() }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 lg:h-8 lg:w-8 text-violet-500" />
            Conversions
          </h1>
          <p className="text-slate-400 mt-1 text-sm">All publisher conversions</p>
        </div>
        <button onClick={fetchConversions} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</div>}

      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-5 py-4">Publisher</th>
                <th className="px-5 py-4">Link Code</th>
                <th className="px-5 py-4">External UID</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-5" colSpan={6}><div className="h-4 bg-slate-800/60 rounded w-full" /></td>
                  </tr>
                ))
              ) : conversions.length === 0 ? (
                <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                  <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  No conversions found
                </td></tr>
              ) : conversions.map((conv) => (
                <tr key={conv.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{conv.publisher?.name || 'N/A'}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{conv.publisher?.email || 'N/A'}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-400 text-xs">{conv.trackingLink?.uniqueCode || 'N/A'}</td>
                  <td className="px-5 py-4 font-mono text-slate-400 text-xs">{conv.externalUserId}</td>
                  <td className="px-5 py-4 font-mono font-medium">₹{Number(conv.amount).toFixed(2)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
                      <CheckCircle className="h-3 w-3" /> {conv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-slate-400 text-xs">{new Date(conv.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3 mb-2" /><div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))
        ) : conversions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            No conversions found
          </div>
        ) : conversions.map((conv) => (
          <div key={conv.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm">{conv.publisher?.name || 'N/A'}</div>
                <div className="text-slate-500 text-xs">{conv.publisher?.email || 'N/A'}</div>
              </div>
              <span className="font-mono font-bold text-emerald-400">₹{Number(conv.amount).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-blue-400">{conv.trackingLink?.uniqueCode || 'N/A'}</span>
              <span>•</span>
              <span className="truncate">{conv.externalUserId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold">
                <CheckCircle className="h-3 w-3" /> {conv.status}
              </span>
              <span className="text-slate-500">{new Date(conv.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
