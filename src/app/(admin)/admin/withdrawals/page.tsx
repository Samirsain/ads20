'use client'

import { useEffect, useState } from 'react'
import { Wallet, Check, X, RefreshCw, AlertCircle } from 'lucide-react'

interface Withdrawal {
  id: string
  amount: string
  upiId: string
  status: string
  note: string | null
  requestedAt: string
  publisher?: { name: string; email: string }
  user?: { name: string; email: string }
}

export default function AdminWithdrawalsPage() {
  const [publisherWithdrawals, setPublisherWithdrawals] = useState<Withdrawal[]>([])
  const [trafficWithdrawals, setTrafficWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'publisher' | 'traffic'>('publisher')
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const fetchWithdrawals = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/withdrawals')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch withdrawals')
      setPublisherWithdrawals(data.data.publisher || [])
      setTrafficWithdrawals(data.data.traffic || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: 'PAID' | 'REJECTED') => {
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: noteText || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to process request')
      setNoteText('')
      fetchWithdrawals()
    } catch (err: any) {
      alert(err.message || 'Error updating status')
    } finally {
      setActionId(null)
    }
  }

  useEffect(() => { fetchWithdrawals() }, [])

  const currentList = activeTab === 'publisher' ? publisherWithdrawals : trafficWithdrawals

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 lg:h-8 lg:w-8 text-violet-500" />
            Withdrawals
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Approve or reject payout requests</p>
        </div>
        <button onClick={fetchWithdrawals} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex bg-slate-900/40 border border-slate-800 rounded-2xl p-1.5 w-full sm:w-fit">
        {(['publisher', 'traffic'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition capitalize ${
              activeTab === tab
                ? tab === 'publisher' ? 'bg-violet-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}>
            {tab} Payouts
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-5 py-4">Requestor</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">UPI ID</th>
                <th className="px-5 py-4">Requested</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-5" colSpan={6}><div className="h-4 bg-slate-800/60 rounded w-full" /></td>
                  </tr>
                ))
              ) : currentList.length === 0 ? (
                <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                  <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  No withdrawal requests
                </td></tr>
              ) : currentList.map((w) => {
                const name = activeTab === 'publisher' ? w.publisher?.name : w.user?.name
                const email = activeTab === 'publisher' ? w.publisher?.email : w.user?.email
                return (
                  <tr key={w.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{email}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-medium">₹{Number(w.amount).toFixed(2)}</td>
                    <td className="px-5 py-4 font-mono text-xs">{w.upiId}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{new Date(w.requestedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        w.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : w.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>{w.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {w.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <input type="text" placeholder="Note (optional)" onChange={(e) => setNoteText(e.target.value)}
                            className="bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none max-w-[120px]" />
                          <button onClick={() => handleUpdateStatus(w.id, 'PAID')} disabled={actionId === w.id}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 active:scale-90 transition disabled:opacity-50" title="Approve">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleUpdateStatus(w.id, 'REJECTED')} disabled={actionId === w.id}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 active:scale-90 transition disabled:opacity-50" title="Reject">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : <span className="text-slate-500 text-xs">Processed</span>}
                    </td>
                  </tr>
                )
              })}
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
        ) : currentList.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            No withdrawal requests
          </div>
        ) : currentList.map((w) => {
          const name = activeTab === 'publisher' ? w.publisher?.name : w.user?.name
          const email = activeTab === 'publisher' ? w.publisher?.email : w.user?.email
          return (
            <div key={w.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white text-sm">{name}</div>
                  <div className="text-slate-500 text-xs">{email}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-white">₹{Number(w.amount).toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{new Date(w.requestedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-300 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded flex-1 truncate">{w.upiId}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                  w.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : w.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>{w.status}</span>
              </div>
              {w.status === 'PENDING' && (
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <input type="text" placeholder="Note (optional)" onChange={(e) => setNoteText(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleUpdateStatus(w.id, 'PAID')} disabled={actionId === w.id}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => handleUpdateStatus(w.id, 'REJECTED')} disabled={actionId === w.id}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
