'use client'

import { useEffect, useState } from 'react'
import { Users, CheckCircle, XCircle, Search, RefreshCw, AlertCircle } from 'lucide-react'

interface Publisher {
  id: string
  email: string
  name: string
  phone: string | null
  walletBalance: string
  isActive: boolean
  createdAt: string
  _count: { trackingLinks: number; conversions: number }
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
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch publishers')
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
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update publisher status')
      setPublishers((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !currentStatus } : p))
    } catch (err: any) {
      alert(err.message || 'Error updating publisher')
    } finally {
      setActionLoadingId(null)
    }
  }

  useEffect(() => { fetchPublishers() }, [])

  const filtered = publishers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 lg:h-8 lg:w-8 text-violet-500" />
            Publishers
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Manage publisher accounts</p>
        </div>
        <button onClick={fetchPublishers} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input type="text" placeholder="Search by name or email..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition text-sm" />
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</div>}

      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-5 py-4">Publisher</th>
                <th className="px-5 py-4">Balance</th>
                <th className="px-5 py-4">Links</th>
                <th className="px-5 py-4">Conversions</th>
                <th className="px-5 py-4">Joined</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-5" colSpan={7}><div className="h-4 bg-slate-800/60 rounded w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={7}>
                  <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  No publishers found
                </td></tr>
              ) : filtered.map((pub) => (
                <tr key={pub.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{pub.name}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{pub.email}</div>
                  </td>
                  <td className="px-5 py-4 font-mono font-medium">₹{Number(pub.walletBalance).toFixed(2)}</td>
                  <td className="px-5 py-4">{pub._count.trackingLinks}</td>
                  <td className="px-5 py-4 text-emerald-400 font-medium">{pub._count.conversions}</td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{new Date(pub.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      pub.isActive ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'
                    }`}>
                      {pub.isActive ? <><CheckCircle className="h-3 w-3" /> Active</> : <><XCircle className="h-3 w-3" /> Off</>}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => toggleActiveStatus(pub.id, pub.isActive)} disabled={actionLoadingId === pub.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border active:scale-95 transition disabled:opacity-50 ${
                        pub.isActive
                          ? 'bg-red-500/10 hover:bg-red-500 hover:text-white border-red-500/25 text-red-400'
                          : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/25 text-emerald-400'
                      }`}>
                      {actionLoadingId === pub.id ? 'Wait...' : pub.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
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
              <div className="h-4 bg-slate-800 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            No publishers found
          </div>
        ) : filtered.map((pub) => (
          <div key={pub.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{pub.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{pub.email}</div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                pub.isActive ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'
              }`}>
                {pub.isActive ? <><CheckCircle className="h-3 w-3" /> Active</> : <><XCircle className="h-3 w-3" /> Off</>}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/50 rounded-xl p-2">
                <div className="text-base font-bold text-white">₹{Number(pub.walletBalance).toFixed(0)}</div>
                <div className="text-[10px] text-slate-500 uppercase">Balance</div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-2">
                <div className="text-base font-bold text-white">{pub._count.trackingLinks}</div>
                <div className="text-[10px] text-slate-500 uppercase">Links</div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-2">
                <div className="text-base font-bold text-emerald-400">{pub._count.conversions}</div>
                <div className="text-[10px] text-slate-500 uppercase">Conv.</div>
              </div>
            </div>
            <button onClick={() => toggleActiveStatus(pub.id, pub.isActive)} disabled={actionLoadingId === pub.id}
              className={`w-full py-2 rounded-xl text-sm font-semibold border active:scale-95 transition disabled:opacity-50 ${
                pub.isActive
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/25 text-red-400'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-400'
              }`}>
              {actionLoadingId === pub.id ? 'Updating...' : pub.isActive ? 'Deactivate Publisher' : 'Activate Publisher'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
