'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface Conversion {
  id: string
  externalUserId: string
  status: string
  createdAt: string
  trackingLink: { uniqueCode: string; targetUrl: string }
}

export default function PublisherConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  const fetchConversions = async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/publisher/conversions?page=${p}&limit=${limit}`)
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load conversions')
      }
      setConversions(json.data.conversions || [])
      setTotalPages(json.data.pagination.pages || 1)
      setPage(p)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversions(1)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-8 w-8 text-blue-600" />
            Traffic Log
          </h1>
          <p className="text-slate-500 mt-1">All registrations tracked via your publisher referral codes</p>
        </div>
        <button
          onClick={() => fetchConversions(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-semibold"
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

      {/* Conversions Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">External UID</th>
                <th className="px-6 py-4">Tracking Link</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Converted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={4}>
                      <div className="h-5 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : conversions.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={4}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArrowRightLeft className="h-8 w-8 text-slate-400" />
                      <span>No conversions logged yet. Send traffic to your links to generate payouts.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                conversions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {c.externalUserId}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-blue-600 text-xs">
                          {c.trackingLink.uniqueCode}
                        </span>
                        <div className="text-slate-400 text-xs mt-1.5 truncate max-w-[200px]" title={c.trackingLink.targetUrl}>
                          {c.trackingLink.targetUrl}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
            <span className="text-slate-500 text-xs">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => fetchConversions(page - 1)}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-slate-900 text-slate-400 disabled:opacity-50 transition active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => fetchConversions(page + 1)}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-slate-900 text-slate-400 disabled:opacity-50 transition active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
