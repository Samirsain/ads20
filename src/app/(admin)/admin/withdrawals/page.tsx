'use client'

import { useEffect, useState } from 'react'
import { Wallet, Check, X, RefreshCw, AlertCircle } from 'lucide-react'

interface Withdrawal {
  id: string
  amount: string
  walletAddress: string
  network: string
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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch withdrawals')
      }
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

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process request')
      }

      setNoteText('')
      fetchWithdrawals() // reload lists
    } catch (err: any) {
      alert(err.message || 'Error updating status')
    } finally {
      setActionId(null)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const currentList = activeTab === 'publisher' ? publisherWithdrawals : trafficWithdrawals

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8 text-violet-600" />
            Withdrawals
          </h1>
          <p className="text-slate-500 mt-1">Review and approve payout requests for publishers and traffic users</p>
        </div>
        <button
          onClick={fetchWithdrawals}
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

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab('publisher')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'publisher'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Publisher Payouts
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'traffic'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Traffic Payouts
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Requestor</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Wallet Address</th>
                <th className="px-6 py-4">Requested At</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Note</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={7}>
                      <div className="h-5 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : currentList.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                      <span>No withdrawal requests found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((w) => {
                  const requesterName = activeTab === 'publisher' ? w.publisher?.name : w.user?.name
                  const requesterEmail = activeTab === 'publisher' ? w.publisher?.email : w.user?.email

                  return (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-900">{requesterName}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{requesterEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        ${Number(w.amount).toFixed(2)} USDT
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">{w.network}</span>
                          <span className="font-mono text-xs text-slate-500 truncate max-w-[140px]">{w.walletAddress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(w.requestedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            w.status === 'PENDING'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : w.status === 'PAID'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs italic max-w-[150px] truncate">
                        {w.note || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="text"
                              placeholder="Add optional note..."
                              onChange={(e) => setNoteText(e.target.value)}
                              className="bg-white border border-slate-300 focus:border-violet-500 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none max-w-[120px]"
                            />
                            <button
                              onClick={() => handleUpdateStatus(w.id, 'PAID')}
                              disabled={actionId === w.id}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 active:scale-90 transition disabled:opacity-50"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(w.id, 'REJECTED')}
                              disabled={actionId === w.id}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 active:scale-90 transition disabled:opacity-50"
                              title="Reject (Refunds Balance)"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Processed</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
