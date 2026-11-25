'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  CalendarClock,
  Info,
  ShieldCheck,
} from 'lucide-react'

interface Withdrawal {
  id: string
  amount: string
  walletAddress: string
  network: string
  status: string
  note: string | null
  txReference: string | null
  requestedAt: string
  processedAt: string | null
}

interface Summary {
  availableBalance: number
  pendingPayment: number
  totalPaid: number
  todayEarnings: number
  minWithdrawal: number
  canWithdraw: boolean
  shortfallToMin: number
}

const NETWORKS = [
  { value: 'TRC20', label: 'TRC20 (Tron)' },
  { value: 'ERC20', label: 'ERC20 (Ethereum)' },
  { value: 'BEP20', label: 'BEP20 (BSC)' },
]

export default function TrafficWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [network, setNetwork] = useState('TRC20')
  const [requesting, setRequesting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadWithdrawals = useCallback(async () => {
    const res = await fetch('/api/traffic/withdraw')
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load withdrawals')
    return {
      withdrawals: (json.data || []) as Withdrawal[],
      summary: (json.summary ?? null) as Summary | null,
    }
  }, [])

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await loadWithdrawals()
      setWithdrawals(d.withdrawals)
      setSummary(d.summary)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadWithdrawals])

  useEffect(() => {
    let active = true
    loadWithdrawals()
      .then((d) => {
        if (!active) return
        setWithdrawals(d.withdrawals)
        setSummary(d.summary)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [loadWithdrawals])

  const minW = summary?.minWithdrawal ?? 15
  const available = summary?.availableBalance ?? 0
  const canWithdraw = (summary?.canWithdraw ?? false) && available >= minW

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWithdraw) {
      setFormError(`Minimum available balance is $${minW.toFixed(2)}.`)
      return
    }
    setRequesting(true)
    setFormError('')
    setSuccessMsg('')
    try {
      const idempotencyKey = `trw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const res = await fetch('/api/traffic/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          walletAddress: walletAddress.trim(),
          network,
          idempotencyKey,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Withdrawal request failed')
      setSuccessMsg('Withdrawal requested successfully!')
      setAmount('')
      setWalletAddress('')
      setNetwork('TRC20')
      await fetchWithdrawals()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error requesting withdrawal')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-teal-600" />
            Withdraw Funds
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Daily USDT payouts processed 12:00 PM – 2:00 PM IST · Minimum ${minW.toFixed(2)}
          </p>
        </div>
        <Link href="/traffic/dashboard" className="text-sm font-semibold text-teal-700 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-teal-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Available</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">${available.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending</p>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-1">${(summary?.pendingPayment ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Paid</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">${(summary?.totalPaid ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Today (Next-Day)</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">${(summary?.todayEarnings ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-teal-50 border border-teal-200">
        <CalendarClock className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-teal-900 font-semibold text-sm">Daily Payments Available — 12:00 PM – 2:00 PM IST</p>
          <p className="text-teal-700 text-xs mt-0.5">
            Minimum withdrawal: <strong>${minW.toFixed(2)} USD</strong>. Today&apos;s valid earnings settle the following calendar day (IST).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="text-xl font-bold text-slate-900">Request Payout</h3>
            {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
              </div>
            )}
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Amount (USD)</label>
                  {canWithdraw && (
                    <button
                      type="button"
                      onClick={() => setAmount(available.toFixed(2))}
                      className="text-xs font-semibold text-teal-600 hover:underline"
                    >
                      Max (${available.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">$</span>
                  <input
                    type="number"
                    required
                    min={minW}
                    max={available > 0 ? available : undefined}
                    step="0.01"
                    value={amount}
                    disabled={!canWithdraw || requesting}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl pl-7 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 transition font-mono disabled:bg-slate-50"
                    placeholder={minW.toFixed(2)}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Minimum: ${minW.toFixed(2)} USDT</p>
              </div>
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
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">USDT Wallet Address</label>
                <input
                  type="text"
                  required
                  value={walletAddress}
                  disabled={!canWithdraw || requesting}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 transition font-mono text-xs disabled:bg-slate-50"
                  placeholder={network === 'TRC20' ? 'T...' : '0x...'}
                />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200">
                <Info className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                <p className="text-slate-600 text-xs">
                  Processed in the daily 12:00 PM – 2:00 PM IST payout batch after admin approval.
                </p>
              </div>
              <button
                type="submit"
                disabled={!canWithdraw || requesting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold rounded-xl py-3 shadow-lg active:scale-[0.98] transition disabled:opacity-50"
              >
                {requesting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                ) : !canWithdraw ? (
                  <>Need ${(summary?.shortfallToMin ?? minW).toFixed(2)} More</>
                ) : (
                  <>Submit Request <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Payment History</h3>
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
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                <p>No withdrawal requests found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-lg font-bold text-emerald-600">
                          ${Number(w.amount).toFixed(2)} USDT
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {w.network}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                        {w.status === 'APPROVED' && <ShieldCheck className="h-3 w-3 text-blue-600" />}
                        {w.status === 'PENDING' && <Clock className="h-3 w-3 text-amber-600" />}
                        {w.status === 'PAID' && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                        {w.status}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-500 truncate">{w.walletAddress}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(w.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                      {w.txReference && <span className="font-mono text-emerald-700">· TxRef: {w.txReference}</span>}
                      {w.note && <span className="italic">· {w.note}</span>}
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
