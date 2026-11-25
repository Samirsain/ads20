'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  CalendarClock,
  Info,
  Copy,
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
  payoutBatchDate: string | null
  requestedAt: string
  approvedAt: string | null
  processedAt: string | null
}

interface FinancialSummary {
  availableBalance: number
  pendingPayment: number
  totalPaid: number
  todayEarnings: number
  yesterdayEarnings: number
  minWithdrawal: number
  canWithdraw: boolean
  shortfallToMin: number
  payoutWindow: {
    active: boolean
    currentIstTime: string
    windowLabel: string
    nextBatchDate: string
  }
}

const NETWORKS = [
  { value: 'TRC20', label: 'TRC20 (Tron)' },
  { value: 'ERC20', label: 'ERC20 (Ethereum)' },
  { value: 'BEP20', label: 'BEP20 (BSC)' },
]

export default function PublisherWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [network, setNetwork] = useState('TRC20')
  const [requesting, setRequesting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadWithdrawals = useCallback(async () => {
    const res = await fetch('/api/publisher/withdraw')
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load withdrawals')
    return {
      withdrawals: (json.data || []) as Withdrawal[],
      summary: (json.summary ?? null) as FinancialSummary | null,
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
  const progressPct = Math.min(100, Math.round((available / minW) * 100))

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWithdraw) {
      setFormError(`Available settled balance must be at least $${minW.toFixed(2)} to withdraw.`)
      return
    }
    const parsedAmount = parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < minW) {
      setFormError(`Minimum withdrawal amount is $${minW.toFixed(2)}.`)
      return
    }
    if (parsedAmount > available) {
      setFormError(`Amount exceeds available settled balance ($${available.toFixed(2)}).`)
      return
    }

    setRequesting(true)
    setFormError('')
    setSuccessMsg('')
    try {
      const idempotencyKey = `pubw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const res = await fetch('/api/publisher/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          walletAddress: walletAddress.trim(),
          network,
          idempotencyKey,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Withdrawal request failed')
      setSuccessMsg('Withdrawal requested and funds reserved for daily payout!')
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

  const copyAddress = (addr: string, id: string) => {
    void navigator.clipboard.writeText(addr).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Wallet className="h-7 w-7 text-blue-600" />
          Withdraw Funds
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Daily USDT payouts processed 12:00 PM – 2:00 PM IST · Minimum ${minW.toFixed(2)}
        </p>
      </div>

      {/* Balance Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Balance</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">${available.toFixed(2)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Eligible to withdraw</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payment</p>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-1">
            ${(summary?.pendingPayment ?? 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Reserved in requests</p>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            ${(summary?.totalPaid ?? 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed payouts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Earnings</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            ${(summary?.todayEarnings ?? 0).toFixed(4)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Settles tomorrow (IST)</p>
        </div>
      </div>

      {/* Daily Payout Window Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <CalendarClock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-900 font-semibold text-sm">
              Daily Payments Available — 12:00 PM – 2:00 PM IST (Every Day)
            </p>
            <p className="text-blue-700 text-xs mt-0.5">
              Minimum withdrawal: <strong>${minW.toFixed(2)} USD</strong>. Today&apos;s validated earnings become withdrawable the next day. Balances below ${minW.toFixed(2)} carry forward automatically.
            </p>
          </div>
        </div>
        <div className="w-full sm:w-52 shrink-0 bg-white rounded-xl border border-blue-200 px-3 py-2">
          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <span>Progress to ${minW}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${canWithdraw ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:sticky lg:top-8 space-y-5">
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
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Amount (USD)</label>
                  {canWithdraw && (
                    <button
                      type="button"
                      onClick={() => setAmount(available.toFixed(2))}
                      className="text-xs font-semibold text-blue-600 hover:underline"
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
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!canWithdraw || requesting}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl pl-7 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono disabled:bg-slate-50 disabled:text-slate-400"
                    placeholder={minW.toFixed(2)}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Minimum: ${minW.toFixed(2)} · Available: ${available.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setNetwork(n.value)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                        network === n.value
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {n.value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {NETWORKS.find((n) => n.value === network)?.label}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">USDT Wallet Address</label>
                <input
                  type="text"
                  required
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  disabled={!canWithdraw || requesting}
                  className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono text-xs disabled:bg-slate-50"
                  placeholder={network === 'TRC20' ? 'T...' : network === 'ERC20' ? '0x...' : '0x...'}
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-slate-600 text-xs">
                  {canWithdraw
                    ? 'Funds are reserved immediately upon submission and processed in the daily 12:00 PM – 2:00 PM IST payout batch after admin approval.'
                    : `You need at least $${minW.toFixed(2)} in settled available balance to submit a withdrawal.`}
                </p>
              </div>

              <button
                type="submit"
                disabled={!canWithdraw || requesting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-blue-600/15 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Reserving...
                  </>
                ) : !canWithdraw ? (
                  <>Need $${(summary?.shortfallToMin ?? minW).toFixed(2)} More</>
                ) : (
                  <>
                    Submit Request <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History */}
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
                <p>No withdrawal requests yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-lg font-bold text-slate-900">
                          ${Number(w.amount).toFixed(2)} USDT
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {w.network}
                        </span>
                      </div>
                      <WithdrawalStatusPill status={w.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-slate-500 truncate flex-1">{w.walletAddress}</p>
                      <button
                        onClick={() => copyAddress(w.walletAddress, w.id)}
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition"
                        title="Copy wallet address"
                      >
                        {copiedId === w.id ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        Requested:{' '}
                        {new Date(w.requestedAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      {w.txReference && (
                        <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          TxRef: {w.txReference}
                        </span>
                      )}
                      {w.note && <span className="italic text-slate-500">· {w.note}</span>}
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

function WithdrawalStatusPill({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" /> Pending
        </span>
      )
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldCheck className="h-3 w-3" /> Approved
        </span>
      )
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </span>
      )
    case 'PAID':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="h-3 w-3" /> Paid
        </span>
      )
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="h-3 w-3" /> Rejected (Refunded)
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
          <AlertCircle className="h-3 w-3" /> {status}
        </span>
      )
  }
}
