'use client'

import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, RefreshCw, X, Link2 } from 'lucide-react'

interface TrackingLink {
  id: string
  uniqueCode: string
  targetUrl: string
  clicks: number
  conversions: number
  trackingUrl: string
  createdAt: string
}

export default function LinksPage() {
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchLinks = () => {
    setLoading(true)
    fetch('/api/publisher/links')
      .then((r) => r.json())
      .then((d) => { if (d.success) setLinks(d.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLinks() }, [])

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await fetch('/api/publisher/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error); return }
      setLinks([data.data, ...links])
      setShowModal(false)
      setTargetUrl('')
    } catch {
      setError('Failed to create link')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tracking Links</h1>
          <p className="mt-1 text-sm text-slate-500">{links.length} link{links.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          id="create-link-btn"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Link
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <Link2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-semibold text-slate-500">No tracking links yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first link to start earning</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-4 font-semibold text-slate-600">Code</th>
                <th className="px-5 py-4 font-semibold text-slate-600 hidden md:table-cell">Target URL</th>
                <th className="px-5 py-4 font-semibold text-slate-600">Clicks</th>
                <th className="px-5 py-4 font-semibold text-slate-600 hidden sm:table-cell">Conversions</th>
                <th className="px-5 py-4 font-semibold text-slate-600 hidden lg:table-cell">Created</th>
                <th className="px-5 py-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {link.uniqueCode}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="max-w-48 truncate text-slate-600">{link.targetUrl}</span>
                      <a href={link.targetUrl} target="_blank" rel="noreferrer" className="shrink-0 text-slate-400 hover:text-blue-500">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-700">{link.clicks}</td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="font-semibold text-emerald-600">{link.conversions}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 hidden lg:table-cell">
                    {new Date(link.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => copyLink(link.trackingUrl, link.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition"
                    >
                      {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === link.id ? 'Copied!' : 'Copy URL'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Link Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Create Tracking Link</h3>
              <button onClick={() => { setShowModal(false); setError('') }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createLink} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Destination URL</label>
                <input
                  id="target-url-input"
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com/landing-page"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setError('') }} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  id="create-link-submit"
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {creating ? 'Creating…' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
