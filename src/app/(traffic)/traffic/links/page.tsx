'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Copy,
  Check,
  RefreshCw,
  X,
  Link2,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  BarChart3,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react'

interface TrafficLink {
  id: string
  name: string
  uniqueCode: string
  targetUrl: string
  totalClicks: number
  todayClicks: number
  uniqueClicks: number
  conversions: number
  earned: number
  isActive: boolean
  createdAt: string
  trackingUrl: string
}

export default function TrafficLinksPage() {
  const [links, setLinks] = useState<TrafficLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)

  const [editing, setEditing] = useState<TrafficLink | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleting, setDeleting] = useState<TrafficLink | null>(null)
  const [savingDelete, setSavingDelete] = useState(false)

  const loadLinks = useCallback(async () => {
    const res = await fetch('/api/traffic/links')
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load traffic links')
    }
    return (json.data || []) as TrafficLink[]
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
      .then((next) => { if (active) setLinks(next) })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadLinks])

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setCreatedLink(null)

    try {
      const res = await fetch('/api/traffic/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), targetUrl: targetUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create link')
      }
      setCreatedLink(json.data.trackingUrl || json.data.link)
      void fetchLinks()
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
      const res = await fetch(`/api/traffic/links/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), targetUrl: editUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update link')
      setEditing(null)
      void fetchLinks()
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
      const res = await fetch(`/api/traffic/links/${deleting.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete link')
      setDeleting(null)
      void fetchLinks()
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight flex items-center gap-2">
            <Link2 className="h-7 w-7 text-[#155EEF]" />
            Traffic Links
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Create named traffic links and monitor clicks, country stats &amp; earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchLinks()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[#101828] hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setNewName('')
              setTargetUrl('')
              setCreatedLink(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#155EEF] to-[#06B6D4] hover:opacity-95 text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm active:scale-95 transition text-sm"
          >
            <Plus className="h-5 w-5" />
            Create Link
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden xl:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-[#F8FAFC]">
                <th className="px-6 py-4">Link Name / Target</th>
                <th className="px-6 py-4 text-center">Total Clicks</th>
                <th className="px-6 py-4 text-center">Today</th>
                <th className="px-6 py-4 text-center">Conversions</th>
                <th className="px-6 py-4">Earnings</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={6}><div className="h-5 bg-slate-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={6}>
                    <Link2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    No links created yet. Click &apos;Create Link&apos; to get started.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/traffic/links/${link.id}`} className="font-bold text-[#101828] hover:text-[#155EEF] block">
                        {link.name}
                      </Link>
                      <span className="font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[#155EEF] text-xs inline-block mt-1">
                        {link.uniqueCode}
                      </span>
                      <div className="text-slate-400 text-xs mt-1 truncate max-w-[220px]" title={link.targetUrl}>{link.targetUrl}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-[#101828]">{link.totalClicks}</td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-cyan-700">{link.todayClicks}</td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-emerald-600">{link.conversions}</td>
                    <td className="px-6 py-4 font-mono font-bold text-[#155EEF]">${Number(link.earned).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#155EEF] text-slate-600 transition"
                        >
                          {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <Link
                          href={`/traffic/links/${link.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#155EEF] text-slate-600 transition"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditing(link)
                            setEditName(link.name)
                            setEditUrl(link.targetUrl)
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 hover:border-[#155EEF] text-slate-600 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
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

      {/* Tablet & Mobile Cards */}
      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {!loading &&
          links.map((link) => (
            <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/traffic/links/${link.id}`} className="font-bold text-[#101828] hover:text-[#155EEF] truncate">
                  {link.name}
                </Link>
                <span className="font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[#155EEF] text-xs">
                  {link.uniqueCode}
                </span>
              </div>
              <p className="text-slate-400 text-xs truncate">{link.targetUrl}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 border border-slate-200">
                  <div className="flex items-center gap-1 mb-0.5 text-slate-500">
                    <MousePointerClick className="h-3 w-3 text-[#155EEF]" /> Total Clicks
                  </div>
                  <p className="font-mono font-bold text-[#101828]">{link.totalClicks}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 border border-slate-200">
                  <div className="flex items-center gap-1 mb-0.5 text-slate-500">
                    <Clock className="h-3 w-3 text-[#06B6D4]" /> Today
                  </div>
                  <p className="font-mono font-bold text-cyan-700">{link.todayClicks}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 border border-slate-200">
                  <div className="flex items-center gap-1 mb-0.5 text-slate-500">
                    <TrendingUp className="h-3 w-3 text-emerald-600" /> Conversions
                  </div>
                  <p className="font-mono font-bold text-emerald-600">{link.conversions}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-2.5 border border-slate-200">
                  <div className="flex items-center gap-1 mb-0.5 text-slate-500">
                    <DollarSign className="h-3 w-3 text-[#155EEF]" /> Earned
                  </div>
                  <p className="font-mono font-bold text-[#155EEF]">${Number(link.earned).toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                  className="py-2 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white font-semibold"
                >
                  {copiedId === link.id ? 'Copied' : 'Copy'}
                </button>
                <Link
                  href={`/traffic/links/${link.id}`}
                  className="py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#101828] font-semibold text-center"
                >
                  Analytics
                </Link>
                <button
                  onClick={() => {
                    setEditing(link)
                    setEditName(link.name)
                    setEditUrl(link.targetUrl)
                  }}
                  className="py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[#101828] font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleting(link)}
                  className="py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-red-600 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#101828]/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-lg relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#101828]">Create New Traffic Link</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-[#101828] p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            {createdLink ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5">
                  <span className="font-mono text-xs text-[#155EEF] truncate flex-1">{createdLink}</span>
                  <button
                    onClick={() => copyToClipboard(createdLink, 'modal-copy')}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white rounded-lg text-xs font-semibold"
                  >
                    {copiedId === 'modal-copy' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 bg-slate-100 rounded-xl text-[#101828] font-semibold text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#101828] mb-1.5">Link Name</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Instagram Bio, Campaign 1"
                    className="w-full border border-slate-300 focus:border-[#155EEF] rounded-xl px-4 py-2.5 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#101828] mb-1.5">Destination URL</label>
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://paisawin.online/register"
                    className="w-full border border-slate-300 focus:border-[#155EEF] rounded-xl px-4 py-2.5 text-sm text-[#101828] font-mono focus:outline-none focus:ring-1 focus:ring-[#155EEF]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white font-semibold text-sm disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#101828]/60 backdrop-blur-xs" onClick={() => setEditing(null)} />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-lg relative z-10 space-y-4">
            <h3 className="text-lg font-bold text-[#101828]">Edit Link</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
              />
              <input
                type="url"
                required
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 py-2.5 bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white rounded-xl text-sm font-semibold">
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#101828]/60 backdrop-blur-xs" onClick={() => setDeleting(null)} />
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-lg relative z-10 space-y-4">
            <h3 className="text-lg font-bold text-[#101828]">Delete Link?</h3>
            <p className="text-sm text-slate-600">
              Delete <strong>{deleting.name}</strong> ({deleting.uniqueCode})? Historical earnings stay preserved.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold">Cancel</button>
              <button type="button" onClick={handleConfirmDelete} disabled={savingDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold">
                {savingDelete ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
