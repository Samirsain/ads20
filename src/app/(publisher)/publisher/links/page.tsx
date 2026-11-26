'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Copy,
  Check,
  RefreshCw,
  X,
  Link2,
  AlertCircle,
  Loader2,
  MousePointerClick,
  BarChart3,
  DollarSign,
  Pencil,
  Trash2,
  Clock,
  Search,
} from 'lucide-react'

interface TrackingLink {
  id: string
  name: string
  uniqueCode: string
  targetUrl: string
  linkType: string
  clicks: number
  todayClicks: number
  cpmRate: number
  earnings: number
  isActive: boolean
  createdAt: string
  trackingUrl: string
}

export default function PublisherLinksPage() {
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTargetUrl, setNewTargetUrl] = useState('')
  const [linkType, setLinkType] = useState<'direct' | 'smart'>('direct')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<{ name: string; url: string } | null>(null)

  // Edit Modal
  const [editing, setEditing] = useState<TrackingLink | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete Confirmation Modal
  const [deleting, setDeleting] = useState<TrackingLink | null>(null)
  const [savingDelete, setSavingDelete] = useState(false)

  const loadLinks = useCallback(async () => {
    const res = await fetch('/api/publisher/links')
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load tracking links')
    }
    return (json.data || []) as TrackingLink[]
  }, [])

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setLinks(await loadLinks())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadLinks])

  useEffect(() => {
    let active = true
    loadLinks()
      .then((d) => { if (active) setLinks(d) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Something went wrong') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadLinks])

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setError('Link Name is required')
      return
    }
    setCreating(true)
    setError('')
    setCreatedLink(null)

    try {
      const payload: { name: string; linkType: 'direct' | 'smart'; targetUrl?: string } = {
        name: newName.trim(),
        linkType,
      }
      if (newTargetUrl.trim()) payload.targetUrl = newTargetUrl.trim()

      const res = await fetch('/api/publisher/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create link')
      }

      setCreatedLink({ name: json.data.name, url: json.data.trackingUrl || json.data.link })
      await fetchLinks()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating link')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    setError('')
    try {
      const res = await fetch(`/api/publisher/links/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          targetUrl: editUrl.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update link')
      }
      setEditing(null)
      await fetchLinks()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating link')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleting) return
    setSavingDelete(true)
    setError('')
    try {
      const res = await fetch(`/api/publisher/links/${deleting.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete link')
      }
      setDeleting(null)
      await fetchLinks()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting link')
    } finally {
      setSavingDelete(false)
    }
  }

  const copyToClipboard = (url: string, id: string) => {
    void navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredLinks = links.filter((l) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      l.name.toLowerCase().includes(q) ||
      l.uniqueCode.toLowerCase().includes(q) ||
      l.targetUrl.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Link2 className="h-7 w-7 text-[#155EEF]" />
            My Links
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Create unlimited named links, monitor per-link clicks &amp; earnings, and inspect analytics
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchLinks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[#101828] hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setNewName('')
              setNewTargetUrl('')
              setCreatedLink(null)
              setCreateOpen(true)
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#155EEF] to-[#06B6D4] hover:opacity-95 text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm active:scale-95 transition text-sm"
          >
            <Plus className="h-4 w-4" />
            Create New Link
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by link name, code, or destination URL..."
          className="w-full bg-white border border-slate-200 focus:border-[#155EEF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#101828] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#155EEF] transition"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Desktop Table (xl+) */}
      <div className="hidden xl:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-[#F8FAFC]">
                <th className="px-5 py-3.5">Link Name / Code</th>
                <th className="px-5 py-3.5">Destination URL</th>
                <th className="px-5 py-3.5 text-center">Total Clicks</th>
                <th className="px-5 py-3.5 text-center">Today</th>
                <th className="px-5 py-3.5 text-right">Earnings</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-5" colSpan={7}><div className="h-5 bg-slate-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400" colSpan={7}>
                    <Link2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No links found. Click &apos;Create New Link&apos; to get started.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/publisher/links/${link.id}`}
                        className="font-bold text-[#101828] hover:text-[#155EEF] transition block"
                      >
                        {link.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[#155EEF] text-xs">
                          {link.uniqueCode}
                        </span>
                        {!link.isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            Disabled by Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-600 text-xs truncate max-w-[230px]" title={link.targetUrl}>
                        {link.targetUrl}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-[230px] mt-0.5">
                        {link.trackingUrl}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold font-mono text-[#101828]">
                      {link.clicks.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold font-mono text-cyan-700">
                      {link.todayClicks.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-[#155EEF]">
                      ${link.earnings.toFixed(4)}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(link.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Copy short link"
                          onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#155EEF] text-slate-600 hover:text-[#155EEF] transition"
                        >
                          {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <Link
                          title="View link analytics"
                          href={`/publisher/links/${link.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#155EEF] text-slate-600 hover:text-[#155EEF] transition"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          title="Edit link name or destination"
                          onClick={() => {
                            setEditing(link)
                            setEditName(link.name)
                            setEditUrl(link.targetUrl)
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#155EEF] text-slate-600 hover:text-[#155EEF] transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete link"
                          onClick={() => setDeleting(link)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Cards */}
      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse space-y-2.5">
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-10 bg-slate-200 rounded w-full" />
            </div>
          ))
        ) : filteredLinks.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            <Link2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            No links found. Tap &apos;Create New Link&apos; to get started.
          </div>
        ) : (
          filteredLinks.map((link) => (
            <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/publisher/links/${link.id}`}
                    className="font-bold text-[#101828] hover:text-[#155EEF] text-base truncate block"
                  >
                    {link.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[#155EEF] text-xs">
                      {link.uniqueCode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(link.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
                {!link.isActive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 shrink-0">
                    Disabled
                  </span>
                )}
              </div>

              <p className="text-slate-500 text-xs truncate" title={link.targetUrl}>
                {link.targetUrl}
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <MousePointerClick className="h-3 w-3 text-[#155EEF]" />
                    <span className="text-slate-500 text-[11px]">Clicks</span>
                  </div>
                  <p className="font-mono font-bold text-[#101828] text-sm">{link.clicks.toLocaleString()}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock className="h-3 w-3 text-[#06B6D4]" />
                    <span className="text-slate-500 text-[11px]">Today</span>
                  </div>
                  <p className="font-mono font-bold text-cyan-700 text-sm">{link.todayClicks.toLocaleString()}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                    <span className="text-slate-500 text-[11px]">Earned</span>
                  </div>
                  <p className="font-mono font-bold text-[#155EEF] text-sm">${link.earnings.toFixed(4)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white font-semibold text-xs transition active:scale-95"
                >
                  {copiedId === link.id ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
                <Link
                  href={`/publisher/links/${link.id}`}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#101828] hover:border-[#155EEF] text-xs font-semibold transition"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-[#155EEF]" /> Analytics
                </Link>
                <button
                  onClick={() => {
                    setEditing(link)
                    setEditName(link.name)
                    setEditUrl(link.targetUrl)
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#101828] hover:border-[#155EEF] text-xs font-semibold transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDeleting(link)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create New Link Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#101828]/60 backdrop-blur-xs" onClick={() => setCreateOpen(false)} />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-lg relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#101828]">Create New Link</h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-slate-500 hover:text-[#101828] p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm">{createdLink.name} created!</h5>
                    Share this generated link to track clicks, country stats &amp; earnings.
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5">
                  <span className="font-mono text-xs text-[#155EEF] select-all truncate flex-1 pl-1">
                    {createdLink.url}
                  </span>
                  <button
                    onClick={() => copyToClipboard(createdLink.url, 'modal-copy')}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white rounded-lg text-xs font-semibold shrink-0"
                  >
                    {copiedId === 'modal-copy' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[#101828] font-semibold text-sm transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#101828] mb-1.5">
                    Link Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Bharat, Mayank, Instagram"
                    className="w-full border border-slate-300 focus:border-[#155EEF] rounded-xl px-4 py-2.5 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#101828] mb-1.5">
                    Destination URL <span className="text-xs font-normal text-slate-400">(optional, defaults to campaign URL)</span>
                  </label>
                  <input
                    type="url"
                    value={newTargetUrl}
                    onChange={(e) => setNewTargetUrl(e.target.value)}
                    placeholder="https://paisawin.online/register"
                    className="w-full border border-slate-300 focus:border-[#155EEF] rounded-xl px-4 py-2.5 text-sm text-[#101828] font-mono focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(['direct', 'smart'] as const).map((t) => (
                    <label
                      key={t}
                      className={`p-3 rounded-xl border cursor-pointer text-xs ${
                        linkType === t
                          ? 'border-[#155EEF] bg-blue-50 text-[#101828]'
                          : 'border-slate-200 bg-[#F8FAFC] text-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="linkType"
                        checked={linkType === t}
                        onChange={() => setLinkType(t)}
                        className="sr-only"
                      />
                      <span className="font-bold capitalize block">{t} Link</span>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#155EEF] to-[#06B6D4] hover:opacity-95 text-white font-semibold rounded-xl py-3 shadow-sm transition disabled:opacity-50"
                >
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Link Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#101828]/60 backdrop-blur-xs" onClick={() => setEditing(null)} />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-lg relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#101828]">Edit Link ({editing.uniqueCode})</h3>
              <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-[#101828] p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#101828] mb-1.5">Link Name</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-300 focus:border-[#155EEF] rounded-xl px-4 py-2.5 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#101828] mb-1.5">Destination URL</label>
                <input
                  type="url"
                  required
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full border border-slate-300 focus:border-[#155EEF] rounded-xl px-4 py-2.5 text-sm text-[#101828] font-mono focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white font-semibold text-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#101828]/60 backdrop-blur-xs" onClick={() => setDeleting(null)} />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-lg relative z-10 space-y-4">
            <h3 className="text-lg font-bold text-[#101828]">Delete Link?</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{deleting.name}</strong> ({deleting.uniqueCode})?
              It will stop redirecting new visitors, while your historical earnings &amp; wallet balance remain safely preserved.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={savingDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50"
              >
                {savingDelete ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
