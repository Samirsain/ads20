'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarRange,
  RefreshCw,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Archive,
  Download,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileText,
  X,
  Plus,
} from 'lucide-react'

interface BreakdownItem {
  accountType: 'PUBLISHER' | 'TRAFFIC'
  accountId: string
  name: string
  email: string
  totalClicks: number
  validClicks: number
  conversionsCount: number
  earnings: number
  settlementStatus: string
}

interface ReportRow {
  date: string
  totalClicks: number
  validClicks: number
  conversionsCount: number
  earnings: number
  publisherCount: number
  reportStatus: 'ACTIVE' | 'CLEARED' | 'RESTORED'
  settlementStatus: string
  paymentStatus: string
  clearedMeta: { backupId: string; clearedAt: string; reason: string } | null
  breakdown: BreakdownItem[]
}

interface PreviewItem {
  date: string
  totalClicks: number
  validClicks: number
  earnings: number
  publisherCount: number
  unsettledCount: number
  alreadyCleared: boolean
  safeToClear: boolean
  blockReasons: string[]
}

interface ClearPreview {
  today: string
  dates: string[]
  requiresSecondConfirmation: boolean
  allSafe: boolean
  totals: { totalClicks: number; validClicks: number; earnings: number }
  items: PreviewItem[]
}

interface BackupSummary {
  id: string
  reportDates: string[]
  checksumSha256: string
  recordCount: number
  verifiedAt: string
  createdAt: string
}

interface AuditEntry {
  id: string
  action: string
  targetId: string | null
  dates: string[] | null
  affectedCount: number
  reason: string | null
  outcome: string
  backupId: string | null
  createdAt: string
  actorEmail: string | null
}

type ViewTab = 'active' | 'archived' | 'audit'
type DateMode = 'all' | 'single' | 'multi' | 'range'

export default function AdminReportsPage() {
  const [tab, setTab] = useState<ViewTab>('active')
  const [dateMode, setDateMode] = useState<DateMode>('all')
  const [singleDate, setSingleDate] = useState('')
  const [multiInput, setMultiInput] = useState('')
  const [multiDates, setMultiDates] = useState<string[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [today, setToday] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [clearedRows, setClearedRows] = useState<ReportRow[]>([])
  const [archivedCount, setArchivedCount] = useState(0)
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  // Clear modal state
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [preview, setPreview] = useState<ClearPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [clearReason, setClearReason] = useState('')
  const [confirmCheck1, setConfirmCheck1] = useState(false)
  const [confirmCheck2, setConfirmCheck2] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Restore modal state
  const [restoreDates, setRestoreDates] = useState<string[] | null>(null)
  const [restoreReason, setRestoreReason] = useState('')
  const [restoring, setRestoring] = useState(false)

  const fetchReportsPayload = useCallback(async () => {
    const params = new URLSearchParams()
    if (dateMode === 'single' && singleDate) {
      params.set('from', singleDate)
      params.set('to', singleDate)
    } else if (dateMode === 'multi' && multiDates.length > 0) {
      params.set('dates', multiDates.join(','))
    } else if (dateMode === 'range') {
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
    }
    if (tab === 'archived') params.set('onlyCleared', 'true')

    const [repRes, bkpRes] = await Promise.all([
      fetch(`/api/admin/reports?${params}`),
      fetch('/api/admin/reports/backups'),
    ])
    const repJson = await repRes.json()
    if (!repRes.ok || !repJson.success) throw new Error(repJson.error || 'Failed to load reports')

    let bkpData: { backups: BackupSummary[]; auditLogs: AuditEntry[] } | null = null
    if (bkpRes.ok) {
      const bkpJson = await bkpRes.json()
      if (bkpJson.success) bkpData = bkpJson.data
    }
    return { rep: repJson.data, bkp: bkpData }
  }, [dateMode, singleDate, multiDates, fromDate, toDate, tab])

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { rep, bkp } = await fetchReportsPayload()
      setToday(rep.today)
      setRows(rep.rows ?? [])
      setClearedRows(rep.clearedRows ?? [])
      setArchivedCount(rep.archivedCount ?? 0)
      if (bkp) {
        setBackups(bkp.backups ?? [])
        setAuditLogs(bkp.auditLogs ?? [])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [fetchReportsPayload])

  useEffect(() => {
    let active = true
    fetchReportsPayload()
      .then(({ rep, bkp }) => {
        if (!active) return
        setToday(rep.today)
        setRows(rep.rows ?? [])
        setClearedRows(rep.clearedRows ?? [])
        setArchivedCount(rep.archivedCount ?? 0)
        if (bkp) {
          setBackups(bkp.backups ?? [])
          setAuditLogs(bkp.auditLogs ?? [])
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [fetchReportsPayload])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        totalClicks: acc.totalClicks + r.totalClicks,
        validClicks: acc.validClicks + r.validClicks,
        conversions: acc.conversions + r.conversionsCount,
        earnings: acc.earnings + r.earnings,
      }),
      { totalClicks: 0, validClicks: 0, conversions: 0, earnings: 0 }
    )
  }, [rows])

  const toggleSelectDate = (d: string) => {
    setSelectedDates((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const openClearPreview = async (datesToPreview: string[]) => {
    if (datesToPreview.length === 0) return
    setClearModalOpen(true)
    setPreview(null)
    setPreviewLoading(true)
    setClearReason('')
    setConfirmCheck1(false)
    setConfirmCheck2(false)
    setError('')
    try {
      const res = await fetch('/api/admin/reports/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', dates: datesToPreview }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to preview report clearing')
      setPreview(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Preview failed')
      setClearModalOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleExecuteClear = async () => {
    if (!preview || !preview.allSafe || !confirmCheck1) return
    if (preview.requiresSecondConfirmation && !confirmCheck2) return
    if (clearReason.trim().length < 3) {
      setError('Please enter a reason for clearing reports.')
      return
    }

    setClearing(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/admin/reports/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          dates: preview.dates,
          reason: clearReason.trim(),
          confirmed: true,
          confirmedLargeRange: preview.requiresSecondConfirmation ? confirmCheck2 : true,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Report clearing failed')
      setSuccessMsg(
        `${json.data.message} (Backup ID: ${json.data.backupId ?? 'already archived'})`
      )
      setClearModalOpen(false)
      setSelectedDates([])
      await loadReports()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Clear operation failed')
    } finally {
      setClearing(false)
    }
  }

  const handleRestore = async () => {
    if (!restoreDates || restoreDates.length === 0 || restoreReason.trim().length < 3) return
    setRestoring(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/admin/reports/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: restoreDates, reason: restoreReason.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Restore failed')
      setSuccessMsg(json.data.message)
      setRestoreDates(null)
      setRestoreReason('')
      await loadReports()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  const downloadBackup = async (backupId: string) => {
    try {
      const res = await fetch(`/api/admin/reports/backups?id=${encodeURIComponent(backupId)}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to download backup')
      const blob = new Blob([json.data.payloadJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ads2pub-report-backup-${backupId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarRange className="h-7 w-7 text-violet-600" />
            Date-Wise Traffic Reports (IST)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Asia/Kolkata reporting, publisher breakdown, verified backups &amp; safe report clearing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedDates.length > 0 && tab === 'active' && (
            <button
              onClick={() => openClearPreview(selectedDates)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              Clear Selected ({selectedDates.length})
            </button>
          )}
          <button
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Safety Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-violet-900 text-xs flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
        <span>
          <strong>Safe Report Clearing:</strong> Clearing historical dates creates a SHA-256 verified backup and archives report visibility only. Publisher wallets, pending payments, withdrawal history, ledger entries, and click deduplication keys are <strong>never</strong> altered or deleted.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === 'active'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Reports ({rows.length})
        </button>
        <button
          onClick={() => setTab('archived')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === 'archived'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Archive className="h-4 w-4" />
          Cleared / Archived ({archivedCount})
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === 'audit'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          Backups &amp; Audit Log ({backups.length})
        </button>
      </div>

      {tab !== 'audit' && (
        <>
          {/* Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'All Dates' },
                  { id: 'single', label: 'Single Date' },
                  { id: 'multi', label: 'Multiple Dates' },
                  { id: 'range', label: 'Date Range' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDateMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    dateMode === m.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
              {today && (
                <span className="ml-auto text-xs text-slate-400">
                  Today (IST): <span className="font-mono font-semibold text-slate-600">{today}</span>
                </span>
              )}
            </div>

            {dateMode === 'single' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            )}

            {dateMode === 'range' && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            )}

            {dateMode === 'multi' && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={multiInput}
                    onChange={(e) => setMultiInput(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (multiInput && !multiDates.includes(multiInput)) {
                        setMultiDates((p) => [...p, multiInput].sort())
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Date
                  </button>
                </div>
                {multiDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {multiDates.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-mono"
                      >
                        {d}
                        <button
                          onClick={() => setMultiDates((p) => p.filter((x) => x !== d))}
                          className="hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Clicks</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{totals.totalClicks.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase">Valid Clicks</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{totals.validClicks.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase">Conversions</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{totals.conversions.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Earnings</p>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">${totals.earnings.toFixed(4)}</p>
            </div>
          </div>

          {/* Reports Table (xl+ desktop) */}
          <div className="hidden xl:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                    {tab === 'active' && <th className="px-3.5 py-3.5 w-10">Sel</th>}
                    <th className="px-3.5 py-3.5">IST Date</th>
                    <th className="px-3.5 py-3.5 text-right">Clicks</th>
                    <th className="px-3.5 py-3.5 text-right">Valid</th>
                    <th className="px-3.5 py-3.5 text-right">Conv.</th>
                    <th className="px-3.5 py-3.5 text-right">Earnings</th>
                    <th className="px-3.5 py-3.5 text-center">Settlement</th>
                    <th className="px-3.5 py-3.5 text-center">Status</th>
                    <th className="px-3.5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-5" colSpan={9}><div className="h-4 bg-slate-200 rounded w-full" /></td>
                      </tr>
                    ))
                  ) : (tab === 'archived' ? clearedRows : rows).length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-slate-400" colSpan={9}>
                        {tab === 'archived'
                          ? 'No cleared or archived report dates.'
                          : 'No active traffic reports match the selected dates.'}
                      </td>
                    </tr>
                  ) : (
                    (tab === 'archived' ? clearedRows : rows).map((r) => {
                      const isExpanded = expandedDate === r.date
                      const isTodayOrFuture = today ? r.date >= today : false
                      return (
                        <FragmentRow
                          key={r.date}
                          row={r}
                          tab={tab}
                          isExpanded={isExpanded}
                          isTodayOrFuture={isTodayOrFuture}
                          selected={selectedDates.includes(r.date)}
                          onToggleExpand={() => setExpandedDate(isExpanded ? null : r.date)}
                          onToggleSelect={() => toggleSelectDate(r.date)}
                          onClear={() => openClearPreview([r.date])}
                          onRestore={() => {
                            setRestoreDates([r.date])
                            setRestoreReason('')
                          }}
                          onDownloadBackup={downloadBackup}
                        />
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Cards (< xl) */}
          <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse h-28" />
              ))
            ) : (tab === 'archived' ? clearedRows : rows).length === 0 ? (
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
                {tab === 'archived' ? 'No cleared or archived report dates.' : 'No active traffic reports match the selected dates.'}
              </div>
            ) : (
              (tab === 'archived' ? clearedRows : rows).map((r) => {
                const isTodayOrFuture = today ? r.date >= today : false
                const isExpanded = expandedDate === r.date
                return (
                  <div key={r.date} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {tab === 'active' && (
                          <input
                            type="checkbox"
                            checked={selectedDates.includes(r.date)}
                            disabled={isTodayOrFuture}
                            onChange={() => toggleSelectDate(r.date)}
                            className="h-4 w-4"
                          />
                        )}
                        <span className="font-mono font-bold text-slate-900">{r.date}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          r.reportStatus === 'CLEARED'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : r.reportStatus === 'RESTORED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {r.reportStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                        <p className="text-[11px] text-slate-500">Clicks / Valid</p>
                        <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{r.totalClicks} / {r.validClicks}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                        <p className="text-[11px] text-slate-500">Conv.</p>
                        <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{r.conversionsCount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                        <p className="text-[11px] text-slate-500">Earnings</p>
                        <p className="font-mono font-bold text-emerald-700 text-xs mt-0.5">${r.earnings.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedDate(isExpanded ? null : r.date)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {isExpanded ? 'Hide Breakdown' : `Breakdown (${r.breakdown.length})`}
                      </button>
                      <div className="flex items-center gap-2">
                        {tab === 'active' ? (
                          <button
                            onClick={() => openClearPreview([r.date])}
                            disabled={isTodayOrFuture}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-700 disabled:opacity-40"
                          >
                            Clear
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setRestoreDates([r.date])
                              setRestoreReason('')
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && r.breakdown.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        {r.breakdown.map((b) => (
                          <div key={`${b.accountType}-${b.accountId}`} className="flex justify-between text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                            <span className="truncate font-medium text-slate-800">{b.name}</span>
                            <span className="font-mono font-bold text-emerald-700 shrink-0">${b.earnings.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="space-y-6">
          {/* Verified Backups */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Verified Report Backups</h3>
              <p className="text-xs text-slate-500">Restricted admin-only archives created prior to clearing report visibility</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-5 py-3">Backup ID</th>
                    <th className="px-5 py-3">Dates</th>
                    <th className="px-5 py-3 text-right">Records</th>
                    <th className="px-5 py-3">SHA-256 Checksum</th>
                    <th className="px-5 py-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {backups.length === 0 ? (
                    <tr><td className="px-5 py-8 text-center text-slate-400" colSpan={5}>No backups created yet.</td></tr>
                  ) : backups.map((b) => (
                    <tr key={b.id}>
                      <td className="px-5 py-3 font-mono text-xs">{b.id}</td>
                      <td className="px-5 py-3 font-mono text-xs">{b.reportDates.join(', ')}</td>
                      <td className="px-5 py-3 text-right font-mono">{b.recordCount}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{b.checksumSha256.slice(0, 16)}…</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => downloadBackup(b.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                        >
                          <Download className="h-3.5 w-3.5" /> JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Durable Admin Audit Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                    <th className="px-5 py-3">Time (IST)</th>
                    <th className="px-5 py-3">Actor</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Outcome</th>
                    <th className="px-5 py-3">Dates / Target</th>
                    <th className="px-5 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-5 py-3">{log.actorEmail ?? 'Admin'}</td>
                      <td className="px-5 py-3 font-mono font-semibold">{log.action}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>{log.outcome}</span>
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {Array.isArray(log.dates) ? log.dates.join(', ') : log.targetId ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{log.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Safe Clear Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Confirm Safe Report Clearing
              </h3>
              <button onClick={() => setClearModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {previewLoading ? (
              <p className="text-sm text-slate-500 py-8 text-center">Running safety &amp; dependency checks...</p>
            ) : preview ? (
              <>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Dates:</span>
                    <span className="font-mono font-bold text-slate-900">{preview.dates.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Clicks / Valid:</span>
                    <span className="font-mono font-bold">
                      {preview.totals.totalClicks} / {preview.totals.validClicks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Earnings Covered:</span>
                    <span className="font-mono font-bold text-emerald-700">${preview.totals.earnings.toFixed(4)}</span>
                  </div>
                </div>

                {!preview.allSafe && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1.5">
                    <p className="font-bold">Action Blocked — Safety Dependencies Failed:</p>
                    {preview.items
                      .filter((i) => !i.safeToClear)
                      .map((i) => (
                        <div key={i.date}>
                          <strong>{i.date}:</strong> {i.blockReasons.join(' ')}
                        </div>
                      ))}
                  </div>
                )}

                {preview.allSafe && (
                  <>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                      A verified SHA-256 backup will be stored first. <strong>Wallet balances, pending payments, payment history, and ledger records will NOT change.</strong>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reason for clearing (recorded in audit log)
                      </label>
                      <input
                        type="text"
                        value={clearReason}
                        onChange={(e) => setClearReason(e.target.value)}
                        placeholder="e.g. Payment completed for 23 Nov batch"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmCheck1}
                        onChange={(e) => setConfirmCheck1(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        I confirm archiving {preview.dates.length} date(s) ({preview.totals.totalClicks} clicks). Financial balances and payment history remain unchanged.
                      </span>
                    </label>

                    {preview.requiresSecondConfirmation && (
                      <label className="flex items-start gap-2.5 text-xs text-red-700 font-semibold cursor-pointer bg-red-50 p-3 rounded-xl border border-red-200">
                        <input
                          type="checkbox"
                          checked={confirmCheck2}
                          onChange={(e) => setConfirmCheck2(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          Large Range Second Confirmation: Confirm archiving {preview.dates.length} dates together.
                        </span>
                      </label>
                    )}

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        onClick={() => setClearModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteClear}
                        disabled={
                          clearing ||
                          !confirmCheck1 ||
                          (preview.requiresSecondConfirmation && !confirmCheck2) ||
                          clearReason.trim().length < 3
                        }
                        className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {clearing ? 'Backing up & Clearing...' : 'Create Backup & Clear Reports'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoreDates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Restore Report Visibility</h3>
            <p className="text-xs text-slate-500">
              Restoring <strong>{restoreDates.join(', ')}</strong> makes the traffic report visible in Active Reports again. It never re-credits wallets or alters financial history.
            </p>
            <input
              type="text"
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="Reason for restoring..."
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRestoreDates(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring || restoreReason.trim().length < 3}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FragmentRow({
  row,
  tab,
  isExpanded,
  isTodayOrFuture,
  selected,
  onToggleExpand,
  onToggleSelect,
  onClear,
  onRestore,
  onDownloadBackup,
}: {
  row: ReportRow
  tab: ViewTab
  isExpanded: boolean
  isTodayOrFuture: boolean
  selected: boolean
  onToggleExpand: () => void
  onToggleSelect: () => void
  onClear: () => void
  onRestore: () => void
  onDownloadBackup: (id: string) => void
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        {tab === 'active' && (
          <td className="px-4 py-3.5">
            <input
              type="checkbox"
              checked={selected}
              disabled={isTodayOrFuture}
              onChange={onToggleSelect}
              title={isTodayOrFuture ? 'Current/future IST date cannot be cleared' : 'Select for clearing'}
            />
          </td>
        )}
        <td className="px-4 py-3.5">
          <button onClick={onToggleExpand} className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            {row.date}
          </button>
        </td>
        <td className="px-4 py-3.5 text-right font-mono">{row.totalClicks.toLocaleString()}</td>
        <td className="px-4 py-3.5 text-right font-mono">{row.validClicks.toLocaleString()}</td>
        <td className="px-4 py-3.5 text-right font-mono text-violet-700">{row.conversionsCount}</td>
        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">${row.earnings.toFixed(4)}</td>
        <td className="px-4 py-3.5 text-center">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-slate-50 border-slate-200">
            {row.settlementStatus}
          </span>
        </td>
        <td className="px-4 py-3.5 text-center">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              row.reportStatus === 'CLEARED'
                ? 'bg-slate-100 text-slate-600 border-slate-300'
                : row.reportStatus === 'RESTORED'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {row.reportStatus}
          </span>
        </td>
        <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
          {tab === 'active' ? (
            <button
              onClick={onClear}
              disabled={isTodayOrFuture}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition disabled:opacity-40"
            >
              Clear
            </button>
          ) : (
            <>
              {row.clearedMeta && (
                <button
                  onClick={() => onDownloadBackup(row.clearedMeta!.backupId)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-100"
                >
                  Backup
                </button>
              )}
              <button
                onClick={onRestore}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white transition"
              >
                <RotateCcw className="h-3 w-3" /> Restore
              </button>
            </>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/70">
          <td colSpan={tab === 'active' ? 9 : 8} className="px-6 py-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Publisher / Account Breakdown ({row.date} IST)
            </p>
            {row.breakdown.length === 0 ? (
              <p className="text-xs text-slate-400">No account activity recorded for this date.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {row.breakdown.map((b) => (
                  <div key={`${b.accountType}-${b.accountId}`} className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{b.name}</span>
                      <span className="font-mono text-emerald-700">${b.earnings.toFixed(4)}</span>
                    </div>
                    <div className="text-slate-400">{b.email} · {b.accountType}</div>
                    <div className="flex justify-between text-slate-600 pt-1">
                      <span>Clicks: {b.totalClicks} (valid: {b.validClicks})</span>
                      <span>{b.settlementStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
