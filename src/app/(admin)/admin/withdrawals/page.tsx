'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import {
  Wallet,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Search,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  History,
} from 'lucide-react'

interface StatusHistoryEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  actorType: string
  txReference: string | null
  note: string | null
  createdAt: string
}

interface Withdrawal {
  id: string
  amount: string
  walletAddress: string
  network: string
  status: string
  note: string | null
  txReference: string | null
  failureReason: string | null
  requestedAt: string
  approvedAt: string | null
  processedAt: string | null
  publisher?: { name: string; email: string }
  user?: { name: string; email: string }
  history?: StatusHistoryEntry[]
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'UNCERTAIN'] as const

export default function AdminWithdrawalsPage() {
  const [publisherWithdrawals, setPublisherWithdrawals] = useState<Withdrawal[]>([])
  const [trafficWithdrawals, setTrafficWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'publisher' | 'traffic'>('publisher')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modal state for explicit confirmation & txReference / note entry
  const [modal, setModal] = useState<{
    withdrawal: Withdrawal
    targetStatus: 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'UNCERTAIN'
  } | null>(null)
  const [txRef, setTxRef] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  const fetchWithdrawalsPayload = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (search.trim()) params.set('q', search.trim())
    const res = await fetch(`/api/admin/withdrawals?${params}`)
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch withdrawals')
    }
    return {
      publisher: (data.data.publisher || []) as Withdrawal[],
      traffic: (data.data.traffic || []) as Withdrawal[],
    }
  }, [statusFilter, search])

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await fetchWithdrawalsPayload()
      setPublisherWithdrawals(d.publisher)
      setTrafficWithdrawals(d.traffic)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [fetchWithdrawalsPayload])

  useEffect(() => {
    let active = true
    fetchWithdrawalsPayload()
      .then((d) => {
        if (!active) return
        setPublisherWithdrawals(d.publisher)
        setTrafficWithdrawals(d.traffic)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [fetchWithdrawalsPayload])

  const openActionModal = (
    withdrawal: Withdrawal,
    targetStatus: 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'UNCERTAIN'
  ) => {
    setModal({ withdrawal, targetStatus })
    setTxRef(withdrawal.txReference ?? '')
    setNoteInput('')
    setError('')
  }

  const handleConfirmAction = async () => {
    if (!modal) return
    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    try {
      const idempotencyKey = `adm_${modal.withdrawal.id}_${modal.targetStatus}_${Date.now()}`
      const res = await fetch(`/api/admin/withdrawals/${modal.withdrawal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modal.targetStatus,
          txReference: modal.targetStatus === 'PAID' ? txRef.trim() : undefined,
          note: noteInput.trim() || undefined,
          failureReason: modal.targetStatus === 'UNCERTAIN' ? noteInput.trim() : undefined,
          idempotencyKey,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update withdrawal')
      }
      setSuccessMsg(`Withdrawal ${modal.withdrawal.id.slice(-6)} updated to ${modal.targetStatus}.`)
      setModal(null)
      await fetchWithdrawals()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const currentList = activeTab === 'publisher' ? publisherWithdrawals : trafficWithdrawals

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-violet-600" />
            Withdrawals &amp; Payout Lifecycle
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pending &rarr; Approved &rarr; Paid / Rejected / Uncertain with atomic reservation tracking
          </p>
        </div>
        <button
          onClick={fetchWithdrawals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{successMsg}</div>
      )}

      {/* Tabs + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('publisher')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'publisher' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Publisher ({publisherWithdrawals.length})
            </button>
            <button
              onClick={() => setActiveTab('traffic')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'traffic' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Traffic ({trafficWithdrawals.length})
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, txRef..."
            className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
          />
        </div>
      </div>

      {/* Desktop Table (xl+ so 768px & 1024px get clean card grid without column clipping) */}
      <div className="hidden xl:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-5 py-4">Requestor</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Wallet / Network</th>
                <th className="px-5 py-4">Requested (IST)</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">TxRef / Note</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-6" colSpan={7}><div className="h-5 bg-slate-200 rounded w-full" /></td>
                  </tr>
                ))
              ) : currentList.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400" colSpan={7}>
                    <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No withdrawal requests found
                  </td>
                </tr>
              ) : (
                currentList.map((w) => {
                  const requesterName = activeTab === 'publisher' ? w.publisher?.name : w.user?.name
                  const requesterEmail = activeTab === 'publisher' ? w.publisher?.email : w.user?.email
                  const isOpen = expandedHistoryId === w.id

                  return (
                    <Fragment key={w.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{requesterName}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{requesterEmail}</div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          ${Number(w.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 mr-1.5">
                            {w.network}
                          </span>
                          <span className="font-mono text-xs text-slate-500 break-all">{w.walletAddress}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(w.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={w.status} />
                        </td>
                        <td className="px-5 py-4 text-xs space-y-0.5 max-w-[180px]">
                          {w.txReference && <div className="font-mono text-emerald-700 truncate">Ref: {w.txReference}</div>}
                          {w.note && <div className="text-slate-500 italic truncate">{w.note}</div>}
                          {!w.txReference && !w.note && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {w.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => openActionModal(w, 'APPROVED')}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-semibold transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => openActionModal(w, 'PAID')}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition"
                                  title="Mark Paid"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => openActionModal(w, 'REJECTED')}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 transition"
                                  title="Reject & Refund"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {w.status === 'APPROVED' && (
                              <>
                                <button
                                  onClick={() => openActionModal(w, 'PAID')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-semibold transition"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => openActionModal(w, 'UNCERTAIN')}
                                  className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 text-xs font-semibold transition"
                                >
                                  Uncertain
                                </button>
                                <button
                                  onClick={() => openActionModal(w, 'REJECTED')}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 transition"
                                  title="Reject"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {(w.status === 'PROCESSING' || w.status === 'UNCERTAIN') && (
                              <>
                                <button
                                  onClick={() => openActionModal(w, 'PAID')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-semibold transition"
                                >
                                  Confirm Paid
                                </button>
                                <button
                                  onClick={() => openActionModal(w, 'REJECTED')}
                                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 text-xs font-semibold transition"
                                >
                                  Release &amp; Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setExpandedHistoryId(isOpen ? null : w.id)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700"
                              title="View Status History"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${w.id}-hist`} className="bg-slate-50/70">
                          <td colSpan={7} className="px-6 py-3 text-xs">
                            <p className="font-bold text-slate-600 uppercase mb-1.5">Audit Status History</p>
                            {!w.history || w.history.length === 0 ? (
                              <p className="text-slate-400">No history entries recorded.</p>
                            ) : (
                              <div className="space-y-1">
                                {w.history.map((h) => (
                                  <div key={h.id} className="flex flex-wrap gap-3 text-slate-600">
                                    <span className="font-mono text-slate-400">
                                      {new Date(h.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                    </span>
                                    <span className="font-semibold">
                                      {h.fromStatus ?? 'NEW'} &rarr; {h.toStatus}
                                    </span>
                                    <span>({h.actorType})</span>
                                    {h.txReference && <span className="font-mono text-emerald-700">Ref: {h.txReference}</span>}
                                    {h.note && <span className="italic">{h.note}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Cards */}
      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {currentList.map((w) => {
          const requesterName = activeTab === 'publisher' ? w.publisher?.name : w.user?.name
          return (
            <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{requesterName}</p>
                  <p className="font-mono text-lg font-bold text-emerald-700">${Number(w.amount).toFixed(2)}</p>
                </div>
                <StatusPill status={w.status} />
              </div>
              <p className="font-mono text-xs text-slate-500 break-all">{w.network} · {w.walletAddress}</p>
              <div className="flex flex-wrap gap-2">
                {w.status === 'PENDING' && (
                  <button
                    onClick={() => openActionModal(w, 'APPROVED')}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                  >
                    Approve
                  </button>
                )}
                {(w.status === 'PENDING' || w.status === 'APPROVED' || w.status === 'UNCERTAIN') && (
                  <>
                    <button
                      onClick={() => openActionModal(w, 'PAID')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => openActionModal(w, 'REJECTED')}
                      className="flex-1 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Confirm Transition &rarr; {modal.targetStatus}
            </h3>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p><strong>Amount:</strong> ${Number(modal.withdrawal.amount).toFixed(2)} ({modal.withdrawal.network})</p>
              <p className="font-mono break-all"><strong>Wallet:</strong> {modal.withdrawal.walletAddress}</p>
            </div>

            {modal.targetStatus === 'PAID' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction ID / Payment Reference (Required)
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. TXN-948273 or MOCK-PAID-001"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {modal.targetStatus === 'REJECTED' || modal.targetStatus === 'UNCERTAIN'
                  ? 'Reason (Required)'
                  : 'Admin Note (Optional)'}
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Enter reason or reference note..."
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={
                  submitting ||
                  (modal.targetStatus === 'PAID' && !txRef.trim()) ||
                  (modal.targetStatus === 'REJECTED' && !noteInput.trim())
                }
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? 'Saving...' : `Confirm ${modal.targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 border-amber-200 text-amber-700">
          <Clock className="h-3 w-3" /> PENDING
        </span>
      )
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700">
          <ShieldCheck className="h-3 w-3" /> APPROVED
        </span>
      )
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-indigo-50 border-indigo-200 text-indigo-700">
          <Loader2 className="h-3 w-3 animate-spin" /> PROCESSING
        </span>
      )
    case 'PAID':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
          <Check className="h-3 w-3" /> PAID
        </span>
      )
    case 'UNCERTAIN':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-orange-50 border-orange-200 text-orange-700">
          <AlertTriangle className="h-3 w-3" /> UNCERTAIN
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 border-red-200 text-red-700">
          <X className="h-3 w-3" /> {status}
        </span>
      )
  }
}
