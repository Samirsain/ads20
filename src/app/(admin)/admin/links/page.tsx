'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Link2,
  RefreshCw,
  Search,
  BarChart3,
  Power,
  Users,
  MousePointerClick,
  DollarSign,
  Copy,
  Check,
} from 'lucide-react'

interface AdminLinkItem {
  id: string
  portal: 'publisher' | 'traffic'
  name: string
  uniqueCode: string
  trackingUrl: string
  targetUrl: string
  linkType: string
  totalClicks: number
  todayClicks: number
  conversions: number
  earnings: number
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  owner: { id: string; name: string; email: string }
}

interface UserSummary {
  ownerId: string
  ownerName: string
  ownerEmail: string
  portal: 'publisher' | 'traffic'
  linkCount: number
  activeLinks: number
  totalClicks: number
  totalEarnings: number
}

export default function AdminLinksPage() {
  const [links, setLinks] = useState<AdminLinkItem[]>([])
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [portalFilter, setPortalFilter] = useState<'all' | 'publisher' | 'traffic'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadData = useCallback(async (typeFilter: 'all' | 'publisher' | 'traffic') => {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    const res = await fetch(`/api/admin/links?${params}`)
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load links')
    return json.data as { links: AdminLinkItem[]; userSummaries: UserSummary[] }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await loadData(portalFilter)
      setLinks(d.links)
      setUserSummaries(d.userSummaries)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadData, portalFilter])

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => {
        if (!active) return
        setLoading(true)
        return loadData(portalFilter)
      })
      .then((d) => {
        if (!active || !d) return
        setLinks(d.links)
        setUserSummaries(d.userSummaries)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [loadData, portalFilter])

  const handleToggle = async (item: AdminLinkItem) => {
    setTogglingId(item.id)
    setError('')
    try {
      const res = await fetch(`/api/admin/links/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: item.portal, isActive: !item.isActive }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update link status')
      setLinks((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, isActive: !item.isActive } : l))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle link')
    } finally {
      setTogglingId(null)
    }
  }

  const copyLink = (url: string, id: string) => {
    void navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const q = search.trim().toLowerCase()
  const filteredLinks = links.filter((l) => {
    if (!q) return true
    return (
      l.name.toLowerCase().includes(q) ||
      l.uniqueCode.toLowerCase().includes(q) ||
      l.targetUrl.toLowerCase().includes(q) ||
      l.owner.name.toLowerCase().includes(q) ||
      l.owner.email.toLowerCase().includes(q)
    )
  })

  const totalLinks = filteredLinks.length
  const totalClicks = filteredLinks.reduce((s, l) => s + l.totalClicks, 0)
  const totalEarnings = filteredLinks.reduce((s, l) => s + l.earnings, 0)

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Link2 className="h-7 w-7 text-[#155EEF]" />
            All Users Links
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Inspect user-wise links, clicks, link-wise earnings, analytics, and enable/disable controls
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[#101828] hover:bg-slate-100 text-sm font-semibold transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'publisher', 'traffic'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setPortalFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                portalFilter === tab
                  ? 'bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white border-transparent'
                  : 'bg-[#F8FAFC] text-slate-600 border-slate-200 hover:text-[#101828]'
              }`}
            >
              {tab === 'all' ? 'All Portals' : `${tab} Links`}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by link name, code, destination URL, or user..."
            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#155EEF] rounded-xl pl-10 pr-4 py-2 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Links</p>
            <p className="text-2xl font-bold font-mono text-[#101828] mt-1">{totalLinks.toLocaleString()}</p>
          </div>
          <Link2 className="h-6 w-6 text-[#155EEF]" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Combined Clicks</p>
            <p className="text-2xl font-bold font-mono text-[#101828] mt-1">{totalClicks.toLocaleString()}</p>
          </div>
          <MousePointerClick className="h-6 w-6 text-[#06B6D4]" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Link-Wise Earnings</p>
            <p className="text-2xl font-bold font-mono text-[#155EEF] mt-1">${totalEarnings.toFixed(2)}</p>
          </div>
          <DollarSign className="h-6 w-6 text-emerald-600" />
        </div>
      </div>

      {/* User-Wise Click Summary */}
      {userSummaries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4 text-[#155EEF]" />
            User-Wise Clicks &amp; Links Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {userSummaries.slice(0, 9).map((u) => (
              <div
                key={`${u.portal}:${u.ownerId}`}
                className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#101828] truncate">{u.ownerName}</p>
                  <p className="text-xs text-slate-500 truncate">{u.ownerEmail}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                    {u.portal} · {u.activeLinks}/{u.linkCount} active links
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-sm text-[#101828]">{u.totalClicks.toLocaleString()} clicks</p>
                  <p className="font-mono text-xs font-semibold text-[#155EEF]">${u.totalEarnings.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden xl:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-[#F8FAFC]">
                <th className="px-5 py-3.5">Link Name / Code</th>
                <th className="px-5 py-3.5">Owner</th>
                <th className="px-5 py-3.5">Destination URL</th>
                <th className="px-5 py-3.5 text-center">Clicks (Today)</th>
                <th className="px-5 py-3.5 text-right">Earnings</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-5 py-5"><div className="h-4 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">No links match your search.</td>
                </tr>
              ) : (
                filteredLinks.map((item) => (
                  <tr key={`${item.portal}:${item.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/links/${item.id}?type=${item.portal}`}
                        className="font-bold text-[#101828] hover:text-[#155EEF] block"
                      >
                        {item.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-xs bg-blue-50 border border-blue-200 text-[#155EEF] px-2 py-0.5 rounded">
                          {item.uniqueCode}
                        </span>
                        <span className="text-[11px] uppercase font-semibold text-slate-400">
                          {item.portal}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#101828]">{item.owner.name}</div>
                      <div className="text-xs text-slate-400">{item.owner.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-slate-600 truncate max-w-[200px]" title={item.targetUrl}>
                        {item.targetUrl}
                      </div>
                      <button
                        onClick={() => copyLink(item.trackingUrl, item.id)}
                        className="text-[11px] font-mono text-[#155EEF] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {item.trackingUrl}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center font-mono">
                      <span className="font-bold text-[#101828]">{item.totalClicks.toLocaleString()}</span>
                      <span className="text-xs text-cyan-700 ml-1">({item.todayClicks})</span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-[#155EEF]">
                      ${item.earnings.toFixed(4)}
                      <div className="text-[11px] font-normal text-slate-400">{item.conversions} conv</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          item.isDeleted
                            ? 'bg-slate-100 border-slate-200 text-slate-500'
                            : item.isActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {item.isDeleted ? 'Deleted' : item.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/links/${item.id}?type=${item.portal}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-[#101828] hover:border-[#155EEF]"
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-[#155EEF]" />
                          Analytics
                        </Link>
                        {!item.isDeleted && (
                          <button
                            disabled={togglingId === item.id}
                            onClick={() => handleToggle(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-50 ${
                              item.isActive
                                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {item.isActive ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tablet & Mobile Cards */}
      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {!loading &&
          filteredLinks.map((item) => (
            <div key={`${item.portal}:${item.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/links/${item.id}?type=${item.portal}`}
                    className="font-bold text-[#101828] text-sm truncate block"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">
                    {item.owner.name} ({item.owner.email})
                  </p>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                    item.isDeleted
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : item.isActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {item.isDeleted ? 'Deleted' : item.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>

              <p className="text-xs text-slate-400 truncate">{item.targetUrl}</p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2 text-center">
                  <span className="text-slate-500 block">Clicks</span>
                  <span className="font-mono font-bold text-[#101828]">{item.totalClicks}</span>
                </div>
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2 text-center">
                  <span className="text-slate-500 block">Today</span>
                  <span className="font-mono font-bold text-cyan-700">{item.todayClicks}</span>
                </div>
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-2 text-center">
                  <span className="text-slate-500 block">Earned</span>
                  <span className="font-mono font-bold text-[#155EEF]">${item.earnings.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/links/${item.id}?type=${item.portal}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-[#101828]"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-[#155EEF]" /> Analytics
                </Link>
                {!item.isDeleted && (
                  <button
                    disabled={togglingId === item.id}
                    onClick={() => handleToggle(item)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border ${
                      item.isActive
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {item.isActive ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

