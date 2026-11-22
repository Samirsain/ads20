'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'

interface ConversionRow {
  id: string
  externalUserId: string
  clickId: string | null
  amount: string
  status: string
  createdAt: string
  publisher: { id: string; name: string; email: string }
  trackingLink: { id: string; uniqueCode: string; targetUrl: string }
}

interface PublisherTotal {
  publisherId: string
  name: string | null
  email: string | null
  conversions: number
}

interface LinkTotal {
  linkId: string
  code: string
  targetUrl: string
  createdAt: string
  publisherId: string
  publisherName: string
  conversions: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface ConversionsData {
  timezone: string
  today: string
  summary: { allTime: number; today: number; matching: number }
  selected: {
    publisher: { id: string; name: string; email: string } | null
    link: { id: string; uniqueCode: string; targetUrl: string } | null
  }
  byPublisher: PublisherTotal[]
  byLink: LinkTotal[]
  breakdownLimit: number
  conversions: ConversionRow[]
  pagination: Pagination
}

interface RejectedEvent {
  id: string
  at: string
  source: string
  code: string | null
  uid: string | null
  clickId: string | null
  secretMatched: boolean
  secretHint: string
  ip: string | null
  result: string
}

type Tab = 'records' | 'publishers' | 'links' | 'review'
type Filters = { publisherId: string; linkId: string; from: string; to: string; q: string }

const EMPTY_FILTERS: Filters = { publisherId: '', linkId: '', from: '', to: '', q: '' }
const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof Filters)[]

function toQuery(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) if (filters[key]) params.set(key, filters[key])
  return params
}

export default function AdminConversionsPage() {
  // null until the URL has been read, so a deep link never fetches unfiltered first
  const [filters, setFilters] = useState<Filters | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<Tab>('records')
  const [data, setData] = useState<ConversionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [events, setEvents] = useState<RejectedEvent[]>([])
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsPagination, setEventsPagination] = useState<Pagination | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)

  // Deep links such as /admin/conversions?publisherId=… open pre-filtered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial = { ...EMPTY_FILTERS }
    for (const key of FILTER_KEYS) initial[key] = params.get(key) ?? ''
    setFilters(initial)
    setSearch(initial.q)
    if (initial.publisherId && !initial.linkId) setTab('links')
  }, [])

  const load = useCallback(async () => {
    if (!filters) return
    setLoading(true)
    setError('')
    try {
      const params = toQuery(filters)
      const qs = params.toString()
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
      params.set('page', String(page))
      const res = await fetch(`/api/admin/conversions?${params}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load conversions')
      setData(json.data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    try {
      const res = await fetch(`/api/admin/postback-log?outcome=REJECTED&limit=20&page=${eventsPage}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load rejected callbacks')
      setEvents(json.data)
      setEventsPagination(json.pagination)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setEventsLoading(false)
    }
  }, [eventsPage])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (tab === 'review') loadEvents()
  }, [tab, loadEvents])

  const update = (patch: Partial<Filters>, nextTab?: Tab) => {
    setFilters((f) => ({ ...(f ?? EMPTY_FILTERS), ...patch }))
    setPage(1)
    if (nextTab) setTab(nextTab)
  }

  const clearAll = () => {
    setSearch('')
    update(EMPTY_FILTERS)
  }

  const timezone = data?.timezone ?? 'UTC'
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    )

  const f = filters ?? EMPTY_FILTERS
  const hasFilters = FILTER_KEYS.some((key) => f[key])
  const publisherLabel = data?.selected.publisher?.name ?? f.publisherId
  const linkLabel = data?.selected.link?.uniqueCode ?? f.linkId

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'records', label: 'Records', count: data?.summary.matching },
    { id: 'publishers', label: 'By publisher', count: data?.byPublisher.length },
    { id: 'links', label: 'By link', count: data?.byLink.length },
    { id: 'review', label: 'Rejected callbacks' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-violet-600" />
            Conversions
          </h1>
          <p className="text-slate-500 mt-1">
            Successful PaisaWin registrations attributed to publisher links. Visible to admins only.
          </p>
        </div>
        <button
          onClick={() => {
            load()
            if (tab === 'review') loadEvents()
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total conversions" value={data?.summary.allTime} hint="All time, all publishers" loading={!data} />
        <SummaryCard label="Today" value={data?.summary.today} hint={data ? `${data.today} · ${timezone}` : ''} loading={!data} />
        <SummaryCard
          label="Matching filters"
          value={data?.summary.matching}
          hint={hasFilters ? 'For the current selection' : 'No filters applied'}
          loading={!data}
          accent
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              update({ q: search.trim() }, 'records')
            }}
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search publisher, link code, registration ref, click ID… then press Enter"
              aria-label="Search conversions"
              className="w-full bg-white border border-slate-300 focus:border-violet-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
            />
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              aria-label="From date"
              value={f.from}
              max={f.to || data?.today}
              onChange={(e) => update({ from: e.target.value })}
              className="bg-white border border-slate-300 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              aria-label="To date"
              value={f.to}
              min={f.from || undefined}
              max={data?.today}
              onChange={(e) => update({ to: e.target.value })}
              className="bg-white border border-slate-300 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={() => data && update({ from: data.today, to: data.today })}
              disabled={!data}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
            >
              Today
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {f.publisherId && (
              <Chip label={`Publisher: ${publisherLabel}`} onRemove={() => update({ publisherId: '', linkId: '' })} />
            )}
            {f.linkId && <Chip label={`Link: ${linkLabel}`} onRemove={() => update({ linkId: '' })} />}
            {(f.from || f.to) && (
              <Chip label={`Date: ${f.from || '…'} → ${f.to || '…'}`} onRemove={() => update({ from: '', to: '' })} />
            )}
            {f.q && (
              <Chip
                label={`Search: "${f.q}"`}
                onRemove={() => {
                  setSearch('')
                  update({ q: '' })
                }}
              />
            )}
            <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-800 underline ml-1">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-2 text-xs ${tab === t.id ? 'text-violet-100' : 'text-slate-400'}`}>
                {t.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'records' && (
        <TableShell
          loading={loading}
          empty={!data || data.conversions.length === 0}
          emptyText={hasFilters ? 'No conversions match these filters' : 'No conversions recorded yet'}
          columns={['Registered at', 'Publisher', 'Link', 'Registration ref', 'Click ID', 'Payout', 'Status', 'Conversion ID']}
          footer={data && <Pager pagination={data.pagination} onPage={setPage} disabled={loading} />}
        >
          {data?.conversions.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-4 whitespace-nowrap text-slate-600 text-xs">{formatTime(c.createdAt)}</td>
              <td className="px-5 py-4">
                <button
                  onClick={() => update({ publisherId: c.publisher.id, linkId: '' }, 'links')}
                  className="font-semibold text-slate-900 hover:text-violet-700 text-left"
                >
                  {c.publisher.name}
                </button>
                <div className="text-slate-400 text-xs font-mono mt-0.5">{c.publisher.id}</div>
              </td>
              <td className="px-5 py-4">
                <button
                  onClick={() => update({ linkId: c.trackingLink.id })}
                  className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-violet-700 text-xs hover:bg-violet-50"
                >
                  {c.trackingLink.uniqueCode}
                </button>
                <div className="text-slate-400 text-xs mt-1 truncate max-w-[220px]" title={c.trackingLink.targetUrl}>
                  {c.trackingLink.targetUrl}
                </div>
              </td>
              <td className="px-5 py-4 font-mono text-xs text-slate-700">{c.externalUserId}</td>
              <td className="px-5 py-4 font-mono text-xs text-slate-500">{c.clickId ?? '—'}</td>
              <td className="px-5 py-4 font-mono text-slate-800">${Number(c.amount).toFixed(2)}</td>
              <td className="px-5 py-4">
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
                  {c.status}
                </span>
              </td>
              <td className="px-5 py-4 font-mono text-xs text-slate-400">{c.id}</td>
            </tr>
          ))}
        </TableShell>
      )}

      {tab === 'publishers' && (
        <TableShell
          loading={loading}
          empty={!data || data.byPublisher.length === 0}
          emptyText="No publisher has conversions for this selection"
          columns={['Publisher', 'Publisher ID', 'Conversions', '']}
          footer={
            data && data.byPublisher.length >= data.breakdownLimit ? (
              <BreakdownNote limit={data.breakdownLimit} />
            ) : null
          }
        >
          {data?.byPublisher.map((p) => (
            <tr key={p.publisherId} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">{p.name ?? 'Deleted publisher'}</div>
                <div className="text-slate-400 text-xs mt-0.5">{p.email}</div>
              </td>
              <td className="px-5 py-4 font-mono text-xs text-slate-500">{p.publisherId}</td>
              <td className="px-5 py-4 font-mono font-bold text-emerald-600">{p.conversions.toLocaleString()}</td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={() => update({ publisherId: p.publisherId, linkId: '' }, 'links')}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white transition"
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </TableShell>
      )}

      {tab === 'links' && (
        <TableShell
          loading={loading}
          empty={!data || data.byLink.length === 0}
          emptyText={f.publisherId ? 'This publisher has no links' : 'No link has conversions for this selection'}
          columns={['Link', 'Destination', 'Publisher', 'Created', 'Conversions', '']}
          footer={
            data && data.byLink.length >= data.breakdownLimit && !f.publisherId ? (
              <BreakdownNote limit={data.breakdownLimit} />
            ) : null
          }
        >
          {data?.byLink.map((l) => (
            <tr key={l.linkId} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-4">
                <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-violet-700 text-xs">
                  {l.code}
                </span>
                <div className="text-slate-400 text-xs font-mono mt-1">{l.linkId}</div>
              </td>
              <td className="px-5 py-4 text-slate-500 text-xs truncate max-w-[240px]" title={l.targetUrl}>
                {l.targetUrl}
              </td>
              <td className="px-5 py-4 text-slate-700">{l.publisherName}</td>
              <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{formatTime(l.createdAt)}</td>
              <td className="px-5 py-4 font-mono font-bold text-emerald-600">{l.conversions.toLocaleString()}</td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={() => update({ linkId: l.linkId }, 'records')}
                  disabled={l.conversions === 0}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  View records
                </button>
              </td>
            </tr>
          ))}
        </TableShell>
      )}

      {tab === 'review' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Callbacks that were <strong>not counted</strong>: invalid secret, unknown link, unsuccessful
              registration status, or a click ID that belongs to another link. Nothing here was credited to any
              publisher. Duplicates of already-counted registrations are not listed.
            </span>
          </div>
          <TableShell
            loading={eventsLoading}
            empty={events.length === 0}
            emptyText="No rejected callbacks"
            columns={['Received at', 'Reason', 'Link code', 'Registration ref', 'Click ID', 'Secret sent', 'Source']}
            footer={
              eventsPagination && (
                <Pager pagination={eventsPagination} onPage={setEventsPage} disabled={eventsLoading} />
              )
            }
          >
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 whitespace-nowrap text-slate-600 text-xs">{formatTime(e.at)}</td>
                <td className="px-5 py-4 text-red-600 font-semibold text-xs">{e.result}</td>
                <td className="px-5 py-4 font-mono text-xs">{e.code ?? '—'}</td>
                <td className="px-5 py-4 font-mono text-xs">{e.uid ?? '—'}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{e.clickId ?? '—'}</td>
                <td className={`px-5 py-4 font-mono text-xs ${e.secretMatched ? 'text-slate-500' : 'text-red-600'}`}>
                  {e.secretHint || '—'}
                </td>
                <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                  {e.source}
                  {e.ip && <span className="font-mono"> · {e.ip}</span>}
                </td>
              </tr>
            ))}
          </TableShell>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  loading,
  accent,
}: {
  label: string
  value?: number
  hint: string
  loading: boolean
  accent?: boolean
}) {
  return (
    <div className={`bg-white border rounded-2xl p-5 ${accent ? 'border-violet-200' : 'border-slate-200'}`}>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse mt-2" />
      ) : (
        <p className="text-3xl font-bold mt-1 text-slate-900">
          {(value ?? 0).toLocaleString()}
        </p>
      )}
      <p className="text-slate-400 text-xs mt-1 truncate">{hint}</p>
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-medium max-w-full">
      <span className="truncate">{label}</span>
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="p-0.5 rounded-full hover:bg-violet-200 transition"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function TableShell({
  loading,
  empty,
  emptyText,
  columns,
  footer,
  children,
}: {
  loading: boolean
  empty: boolean
  emptyText: string
  columns: string[]
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
              {columns.map((c, i) => (
                <th key={i} className="px-5 py-4 whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-6" colSpan={columns.length}>
                    <div className="h-5 bg-slate-200 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : empty ? (
              <tr>
                <td className="px-5 py-12 text-center text-slate-400" colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-slate-300" />
                    <span>{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}

function Pager({
  pagination,
  onPage,
  disabled,
}: {
  pagination: Pagination
  onPage: (page: number) => void
  disabled: boolean
}) {
  if (pagination.pages <= 1) return null
  const { page, pages, total } = pagination
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50">
      <span className="text-slate-500 text-xs">
        Page {page} of {pages} · {total.toLocaleString()} total
      </span>
      <div className="flex items-center gap-2">
        <button
          aria-label="Previous page"
          disabled={page <= 1 || disabled}
          onClick={() => onPage(page - 1)}
          className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 disabled:opacity-50 transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          aria-label="Next page"
          disabled={page >= pages || disabled}
          onClick={() => onPage(page + 1)}
          className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 disabled:opacity-50 transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function BreakdownNote({ limit }: { limit: number }) {
  return (
    <div className="border-t border-slate-200 px-5 py-3 bg-slate-50 text-slate-500 text-xs">
      Showing the top {limit}. Narrow the date range or search to see the rest.
    </div>
  )
}
