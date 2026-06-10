'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle, Loader2, ArrowRight, CalendarClock, Info } from 'lucide-react'

interface Withdrawal {
  id: string
  amount: string
  upiId: string
  status: string
  note: string | null
  requestedAt: string
  processedAt: string | null
}

function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7
  const next = new Date(today)
  next.setDate(today.getDate() + daysUntilMonday)
  return next.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function TrafficWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchWithdrawals = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/traffic/withdraw')
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load withdrawals')
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
      const res = await fetch('/api/traffic/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), upiId }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Withdrawal request failed')
      setSuccessMsg('Withdrawal requested successfully!')
      setAmount('')
      setUpiId('')
      fetchWithdrawals()
    } catch (err: any) {
      setFormError(err.message || 'Error requesting withdrawal')
    } finally {
      setRequesting(false)
    }
  }

  useEffect(() => { fetchWithdrawals() }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 lg:h-8 lg:w-8 text-teal-500" />
          Withdraw Funds
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Request a payout to your UPI ID</p>
      </div>

      {/* Payout Schedule Notice */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
        <CalendarClock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-300 font-semibold text-sm">Weekly Payout — Every Monday</p>
          <p className="text-amber-400/80 text-xs mt-0.5">
            Withdrawal requests are processed once a week. Submit your request before Sunday midnight to receive payment on <span className="font-semibold text-amber-300">{getNextMonday()}</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdrawal Form */}
        <div className="lg:col-span-1 order-1">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl lg:sticky lg:top-8">
            <h3 className="text-lg font-bold text-white mb-5">Request Payout</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="50"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition font-mono text-sm"
                  placeholder="500.00"
                />
                <p className="text-xs text-slate-500 mt-1.5">Minimum withdrawal: ₹50</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">UPI ID</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition text-sm"
                  placeholder="name@upi"
                />
              </div>

              {/* Reminder inside form */}
              <div className="flex items-start gap-2 bg-slate-950/40 rounded-xl p-3 border border-slate-800">
                <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">Payment will be sent on next Monday after admin approval.</p>
              </div>

              <button
                type="submit"
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-medium rounded-xl py-3 shadow-lg shadow-teal-600/15 active:scale-[0.98] transition disabled:opacity-50"
              >
                {requesting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <>Submit Request <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="lg:col-span-2 order-2">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5">Payout History</h3>

            {error ? (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                <p className="font-medium text-slate-400">No withdrawal requests yet</p>
                <p className="text-xs mt-1">Your payout history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-base font-bold text-emerald-400">
                            ₹{Number(w.amount).toFixed(2)}
                          </span>
                          {w.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                          {w.status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="h-3 w-3" /> Paid
                            </span>
                          )}
                          {w.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertCircle className="h-3 w-3" /> Rejected
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>UPI: <span className="text-slate-300 font-mono">{w.upiId}</span></span>
                          <span className="text-slate-600">•</span>
                          <span>{new Date(w.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {w.note && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
                            <span className="text-slate-400 font-medium">Note: </span>{w.note}
                          </p>
                        )}
                      </div>
                    </div>
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
