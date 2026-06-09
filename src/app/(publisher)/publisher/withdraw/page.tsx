'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

interface Withdrawal {
  id: string
  amount: string
  upiId: string
  status: string
  note: string | null
  requestedAt: string
  processedAt: string | null
}

export default function PublisherWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form State
  const [amount, setAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchWithdrawals = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/publisher/withdraw')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load withdrawals')
      }
      setWithdrawals(json.data || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequesting(true)
    setFormError('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/publisher/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), upiId }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Withdrawal request failed')
      }

      setSuccessMsg('Withdrawal requested successfully!')
      setAmount('')
      setUpiId('')
      fetchWithdrawals() // Reload history
    } catch (err: any) {
      setFormError(err.message || 'Error requesting withdrawal')
    } finally {
      setRequesting(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8 text-blue-500" />
          Withdraw Funds
        </h1>
        <p className="text-slate-400 mt-1">Request a payout to your UPI ID and view your history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Withdrawal Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl sticky top-8">
            <h3 className="text-xl font-bold text-white mb-6">Request Payout</h3>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
                {formError}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="50"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono"
                  placeholder="500.00"
                />
                <p className="text-xs text-slate-500 mt-2">Minimum withdrawal: ₹50</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">UPI ID</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="name@upi"
                />
              </div>

              <button
                type="submit"
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl py-3 shadow-lg shadow-blue-600/15 hover:shadow-blue-600/25 active:scale-[0.98] transition disabled:opacity-50 mt-4"
              >
                {requesting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Submit Request
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Payout History</h3>

            {error ? (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
                {error}
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-slate-600" />
                <p>No withdrawal requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((w) => (
                  <div key={w.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-lg font-bold text-emerald-400">
                          ₹{Number(w.amount).toFixed(2)}
                        </span>
                        {w.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> PENDING
                          </span>
                        )}
                        {w.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" /> PAID
                          </span>
                        )}
                        {w.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                            <AlertCircle className="h-3 w-3" /> REJECTED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <span>UPI: <span className="text-slate-300">{w.upiId}</span></span>
                        <span className="hidden sm:inline text-slate-600">•</span>
                        <span>{new Date(w.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {w.note && (
                      <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-400 border border-slate-800 sm:max-w-[200px]">
                        <strong>Note:</strong> {w.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
