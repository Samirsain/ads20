'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  RefreshCw,
  Play,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wallet,
} from 'lucide-react'

interface BatchData {
  timezone: string
  today: string
  minWithdrawal: number
  payoutWindow: {
    active: boolean
    currentIstTime: string
    windowLabel: string
    nextBatchDate: string
  }
  unsettledDates: { date: string; count: number; amount: number }[]
  payoutBatch: {
    approvedCount: number
    totalPayable: number
    pendingApprovalCount: number
    exceptionsCount: number
    approvedPublisherWithdrawals: Array<{
      id: string
      amount: string
      network: string
      walletAddress: string
      publisher: { name: string; email: string }
    }>
    approvedTrafficWithdrawals: Array<{
      id: string
      amount: string
      network: string
      walletAddress: string
      user: { name: string; email: string }
    }>
    eligibleWithoutRequest: Array<{
      accountType: 'PUBLISHER' | 'TRAFFIC'
      id: string
      name: string
      email: string
      availableBalance: number
    }>
  }
  recentBatches: Array<{
    id: string
    batchDate: string
    trafficDate: string
    kind: string
    status: string
    eligibleCount: number
    totalAmount: string
    paidCount: number
    exceptionCount: number
    triggeredBy: string
    startedAt: string
    notes: string | null
  }>
}

export default function AdminSettlementPage() {
  const [data, setData] = useState<BatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchBatchData = useCallback(async () => {
    const res = await fetch('/api/admin/settlement')
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load batch overview')
    return json.data as BatchData
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchBatchData())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [fetchBatchData])

  useEffect(() => {
    let active = true
    fetchBatchData()
      .then((d) => { if (active) setData(d) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Something went wrong') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fetchBatchData])

  const handleRunSettlement = async (targetDate?: string) => {
    setRunning(targetDate ?? 'ALL')
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_settlement', targetDate }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Settlement run failed')
      setSuccess(
        `Settlement complete: ${json.data.settledAccounts} account-day group(s) settled, $${Number(
          json.data.totalCredited
        ).toFixed(4)} moved to Available Balance.`
      )
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Settlement failed')
    } finally {
      setRunning(null)
    }
  }

  const handleMockPayoutBatch = async () => {
    if (!data || data.payoutBatch.approvedCount === 0) return
    const ok = window.confirm(
      `Confirm LOCAL TRIAL MOCK PAYOUT BATCH for ${data.payoutBatch.approvedCount} APPROVED request(s) totaling $${data.payoutBatch.totalPayable.toFixed(
        2
      )}? No real money is sent.`
    )
    if (!ok) return

    setRunning('BATCH')
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_mock_payout_batch' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Batch run failed')
      setSuccess(
        `Local trial batch finished: ${json.data.paidCount} marked PAID ($${Number(
          json.data.totalPaid
        ).toFixed(2)}), ${json.data.exceptionCount} exceptions.`
      )
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch failed')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-violet-600" />
            Next-Day Settlement &amp; Payout Batch
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Daily IST window: <strong>12:00 PM – 2:00 PM IST</strong> · Minimum withdrawal: <strong>$15.00</strong>
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Local Trial Warning */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Local Trial Policy:</strong> Real payout providers are disabled. Approved withdrawal batches execute as mocked local trial runs with simulated <code>MOCK-BATCH-*</code> references.
        </span>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-violet-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Window Status (IST)</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {data?.payoutWindow.active ? 'OPEN NOW' : 'Scheduled 12–2 PM'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Now: {data?.payoutWindow.currentIstTime ?? '—'} IST</p>
        </div>
        <div className="bg-white border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Approved Queue</p>
          <p className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {data?.payoutBatch.approvedCount ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Payable: ${(data?.payoutBatch.totalPayable ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending Approval</p>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {data?.payoutBatch.pendingApprovalCount ?? 0}
          </p>
          <Link href="/admin/withdrawals" className="text-xs text-violet-600 hover:underline">
            Review in Withdrawals →
          </Link>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Exceptions / Uncertain</p>
          <p className="text-2xl font-bold font-mono text-red-700 mt-1">
            {data?.payoutBatch.exceptionsCount ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Requires manual reconciliation</p>
        </div>
      </div>

      {/* Step 1: Next-Day Settlement */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">1. Next-Day Earnings Settlement (IST)</h2>
            <p className="text-xs text-slate-500">
              Moves validated historical earnings (before {data?.today ?? 'today IST'}) into Available Balance idempotently.
            </p>
          </div>
          <button
            onClick={() => handleRunSettlement()}
            disabled={running !== null || (data?.unsettledDates.length ?? 0) === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {running === 'ALL' ? 'Settling...' : 'Settle All Eligible Historical Days'}
          </button>
        </div>

        {data?.unsettledDates.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> All completed historical IST days are settled!
          </div>
        ) : (
          <div className="space-y-2">
            {data?.unsettledDates.map((u) => (
              <div key={u.date} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                <div>
                  <span className="font-mono font-bold text-slate-900">{u.date} (IST)</span>
                  <span className="text-slate-500 text-xs ml-3">{u.count} conversion(s) · ${u.amount.toFixed(4)}</span>
                </div>
                <button
                  onClick={() => handleRunSettlement(u.date)}
                  disabled={running !== null}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {running === u.date ? 'Settling...' : 'Settle Day'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Daily Payout Batch */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">2. Daily Payout Batch (Approved Requests)</h2>
            <p className="text-xs text-slate-500">
              Scheduled batch date: {data?.payoutBatch.approvedCount ? data.payoutWindow.nextBatchDate : '—'}
            </p>
          </div>
          <button
            onClick={handleMockPayoutBatch}
            disabled={running !== null || (data?.payoutBatch.approvedCount ?? 0) === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" />
            {running === 'BATCH' ? 'Processing Batch...' : 'Run Local Trial Payout Batch'}
          </button>
        </div>

        {(data?.payoutBatch.approvedCount ?? 0) === 0 ? (
          <p className="text-sm text-slate-400 py-4">
            No APPROVED withdrawal requests queued. Approve PENDING requests on the Withdrawals page first.
          </p>
        ) : (
          <div className="space-y-2">
            {data?.payoutBatch.approvedPublisherWithdrawals.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{w.publisher.name}</span>
                  <span className="text-slate-400 ml-2">({w.publisher.email})</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">{w.network}</span>
                  <span className="font-bold text-emerald-700">${Number(w.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {data?.payoutBatch.approvedTrafficWithdrawals.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{w.user.name}</span>
                  <span className="text-slate-400 ml-2">({w.user.email} · Traffic)</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">{w.network}</span>
                  <span className="font-bold text-emerald-700">${Number(w.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eligible Accounts Without Request (PRD §4.5) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-900">
          Eligible Publishers Without Withdrawal Request (&ge; $15.00)
        </h3>
        <p className="text-xs text-slate-500">
          These accounts hold at least $15.00 in available settled balance but have not submitted a withdrawal request yet.
        </p>
        {(data?.payoutBatch.eligibleWithoutRequest.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-400 py-2">None right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data?.payoutBatch.eligibleWithoutRequest.map((a) => (
              <div key={`${a.accountType}-${a.id}`} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{a.name}</p>
                  <p className="text-slate-400">{a.email} · {a.accountType}</p>
                </div>
                <span className="font-mono font-bold text-blue-700">${a.availableBalance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Batch Runs */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Recent Settlement &amp; Batch Runs</h3>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                <th className="px-5 py-3">Started (IST)</th>
                <th className="px-5 py-3">Kind</th>
                <th className="px-5 py-3">IST Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!data || data.recentBatches.length === 0 ? (
                <tr><td className="px-5 py-8 text-center text-slate-400" colSpan={6}>No batch runs yet.</td></tr>
              ) : (
                data.recentBatches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                      {new Date(b.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold">{b.kind}</td>
                    <td className="px-5 py-3 font-mono">{b.trafficDate}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        <Clock className="h-3 w-3" /> {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold">${Number(b.totalAmount).toFixed(2)}</td>
                    <td className="px-5 py-3 text-slate-500">{b.triggeredBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-200">
          {!data || data.recentBatches.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">No batch runs yet.</p>
          ) : (
            data.recentBatches.map((b) => (
              <div key={b.id} className="p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-slate-900">{b.kind} · {b.trafficDate}</span>
                  <span className="font-mono font-bold text-emerald-700">${Number(b.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{b.status} ({b.triggeredBy})</span>
                  <span>{new Date(b.startedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
