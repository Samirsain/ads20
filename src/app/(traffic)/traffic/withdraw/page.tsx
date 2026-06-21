'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle, Loader2, ArrowRight, CalendarClock, Info, Copy } from 'lucide-react'

interface Withdrawal {
  id: string
  amount: string
  walletAddress: string
  network: string
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
  return next.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
}

const NETWORKS = [
  { value: 'TRC20', label: 'TRC20 (Tron)' },
  { value: 'ERC20', label: 'ERC20 (Ethereum)' },
  { value: 'BEP20', label: 'BEP20 (BSC)' },
]

export default function TrafficWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [network, setNetwork] = useState('TRC20')
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
        body: JSON.stringify({ amount: parseFloat(amount), walletAddress, network }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Withdrawal request failed')
      setSuccessMsg('Withdrawal requested successfully!')
      setAmount('')
      setWalletAddress('')
      setNetwork('TRC20')
      fetchWithdrawals()
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8 text-teal-500" />
          Withdraw Funds
        </h1>
        <p className="text-slate-500 mt-1">Request a USDT payout to your crypto wallet</p>
      </div>

      {/* Weekly Payout Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <CalendarClock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-amber-800 font-semibold text-sm">Weekly Payout — Every Monday</p>
          <p className="text-amber-600 text-xs mt-0.5">Next payout date: <span className="font-medium text-amber-800">{getNextMonday()}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-8 space-y-5">
            <h3 className="text-xl font-bold text-slate-900">Request Payout</h3>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {formError}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (USDT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">$</span>
                  <input
                    type="number"
                    required
                    min="50"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl pl-7 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition font-mono"
                    placeholder="50.00"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Minimum: $50.00 USDT</p>
              </div>

              {/* Network */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setNetwork(n.value)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        network === n.value
                          ? 'bg-teal-600 border-teal-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {n.value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {NETWORKS.find(n => n.value === network)?.label}
                </p>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">USDT Wallet Address</label>
                <input
                  type="text"
                  required
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition font-mono text-xs"
                  placeholder={network === 'TRC20' ? 'T...' : network === 'ERC20' ? '0x...' : 'bnb...'}
                />
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200">
                <Info className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                <p className="text-slate-600 text-xs">Payment will be sent on next Monday after admin approval. Make sure your address and network match exactly.</p>
              </div>

              <button
                type="submit"
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-medium rounded-xl py-3 shadow-lg shadow-teal-600/15 hover:shadow-teal-600/25 active:scale-[0.98] transition disabled:opacity-50"
              >
                {requesting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <>Submit Request <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Payout History</h3>

            {error ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            ) : loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-slate-400" />
                <p>No withdrawal requests found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-mono text-lg font-bold text-emerald-600">
                        ${Number(w.amount).toFixed(2)} USDT
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                        {w.network}
                      </span>
                      {w.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" /> PENDING
                        </span>
                      )}
                      {w.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" /> PAID
                        </span>
                      )}
                      {w.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="h-3 w-3" /> REJECTED
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-500 truncate">{w.walletAddress}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span>{new Date(w.requestedAt).toLocaleDateString()}</span>
                      {w.note && <><span>•</span><span className="italic">{w.note}</span></>}
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
