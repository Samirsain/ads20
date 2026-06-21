'use client'

import { useEffect, useState } from 'react'
import { Users, CheckCircle, XCircle, Search, RefreshCw, AlertCircle, MousePointerClick } from 'lucide-react'

interface Publisher {
  id: string
  email: string
  name: string
  phone: string | null
  walletBalance: string
  isActive: boolean
  createdAt: string
  totalClicks: number
  _count: {
    trackingLinks: number
    conversions: number
  }
}

export default function AdminPublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchPublishers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/publishers')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch publishers')
      }
      setPublishers(data.data.publishers || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    setActionLoadingId(id)
    try {
      const res = await fetch('/api/admin/publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update publisher status')
      }

      setPublishers((prev) =>
        prev.map((pub) => (pub.id === id ? { ...pub, isActive: !currentStatus } : pub))
      )
    } catch (err: any) {
      alert(err.message || 'Error updating publisher')
    } finally {
      setActionLoadingId(null)
    }
  }

  useEffect(() => {
    fetchPublishers()
  }, [])

  const filteredPublishers = publishers.filter(
    (pub) =>
      pub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-violet-600" />
            Publishers
          </h1>
          <p className="text-slate-500 mt-1">Manage publisher portal user accounts and active statuses</p>
        </div>
        <button
          onClick={fetchPublishers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex bg-white border border-slate-200 rounded-2xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search publishers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-violet-500 rounded-xl pl-11 pr-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Publisher</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-center">Links</th>
                <th className="px-6 py-4 text-center">Total Clicks</th>
                <th className="px-6 py-4 text-center">Conversions</th>
                <th className="px-6 py-4">Joined At</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={8}>
                      <div className="h-5 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredPublishers.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={8}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                      <span>No publishers found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPublishers.map((pub) => (
                  <tr key={pub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{pub.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{pub.email}</div>
                        {pub.phone && <div className="text-slate-400 text-xs">{pub.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      ${Number(pub.walletBalance).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{pub._count.trackingLinks}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-600">
                        <MousePointerClick className="h-3.5 w-3.5" />{pub.totalClicks}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-600">{pub._count.conversions}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(pub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          pub.isActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {pub.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Deactivated
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActiveStatus(pub.id, pub.isActive)}
                        disabled={actionLoadingId === pub.id}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border active:scale-95 transition disabled:opacity-50 ${
                          pub.isActive
                            ? 'bg-red-50 hover:bg-red-600 hover:text-white border-red-200 text-red-600 hover:border-red-600'
                            : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-200 text-emerald-600 hover:border-emerald-600'
                        }`}
                      >
                        {actionLoadingId === pub.id
                          ? 'Updating...'
                          : pub.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-full mb-2" />
              <div className="h-8 bg-slate-200 rounded w-full" />
            </div>
          ))
        ) : filteredPublishers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            No publishers found
          </div>
        ) : filteredPublishers.map((pub) => (
          <div key={pub.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            {/* Name + Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{pub.name}</p>
                <p className="text-slate-400 text-xs">{pub.email}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                pub.isActive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {pub.isActive ? <><CheckCircle className="h-3 w-3" /> Active</> : <><XCircle className="h-3 w-3" /> Off</>}
              </span>
            </div>
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-200">
                <p className="text-slate-400 text-xs mb-0.5">Balance</p>
                <p className="font-mono font-bold text-slate-900 text-xs">${Number(pub.walletBalance).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-200">
                <p className="text-slate-400 text-xs mb-0.5">Links</p>
                <p className="font-bold text-slate-800 text-sm">{pub._count.trackingLinks}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-200">
                <p className="text-slate-400 text-xs mb-0.5">Clicks</p>
                <p className="font-bold text-amber-600 text-sm flex items-center justify-center gap-0.5">
                  <MousePointerClick className="h-3 w-3" />{pub.totalClicks}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-200">
                <p className="text-slate-400 text-xs mb-0.5">Conv.</p>
                <p className="font-bold text-emerald-600 text-sm">{pub._count.conversions}</p>
              </div>
            </div>
            {/* Action */}
            <button
              onClick={() => toggleActiveStatus(pub.id, pub.isActive)}
              disabled={actionLoadingId === pub.id}
              className={`w-full py-2 rounded-xl text-xs font-semibold border active:scale-95 transition disabled:opacity-50 ${
                pub.isActive
                  ? 'bg-red-50 hover:bg-red-600 hover:text-white border-red-200 text-red-600'
                  : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-200 text-emerald-600'
              }`}
            >
              {actionLoadingId === pub.id ? 'Updating...' : pub.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
