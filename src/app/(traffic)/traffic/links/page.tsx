'use client'

import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, RefreshCw, X, Link2, AlertCircle, MousePointerClick, Users, TrendingUp, DollarSign } from 'lucide-react'

interface TrafficLink {
  id: string
  uniqueCode: string
  targetUrl: string
  totalClicks: number
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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)

  const fetchLinks = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/traffic/links')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load traffic links')
      }
      setLinks(json.data || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setCreatedLink(null)

    try {
      const res = await fetch('/api/traffic/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create link')
      }

      setCreatedLink(json.data.link)
      fetchLinks() // reload
    } catch (err: any) {
      setError(err.message || 'Error creating link')
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Link2 className="h-8 w-8 text-teal-500" />
            Traffic Links
          </h1>
          <p className="text-slate-500 mt-1">Manage URLs you are sending traffic to and monitor clicks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLinks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setTargetUrl('')
              setCreatedLink(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold rounded-xl px-5 py-2.5 shadow-lg shadow-teal-600/10 hover:shadow-teal-600/20 active:scale-95 transition text-sm"
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
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">Link Code / Target</th>
                <th className="px-6 py-4 text-center">Total Clicks</th>
                <th className="px-6 py-4 text-center">Unique Clicks</th>
                <th className="px-6 py-4 text-center">Conversions</th>
                <th className="px-6 py-4">Earnings</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={6}><div className="h-5 bg-slate-200 rounded w-full" /></td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={6}>
                    <Link2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    No links created yet. Click &apos;Create Link&apos; to get started.
                  </td>
                </tr>
              ) : links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-teal-600 text-xs">{link.uniqueCode}</span>
                    <div className="text-slate-400 text-xs mt-1.5 truncate max-w-[220px]" title={link.targetUrl}>{link.targetUrl}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold font-mono text-slate-800">{link.totalClicks}</td>
                  <td className="px-6 py-4 text-center font-semibold font-mono text-blue-600">{link.uniqueClicks}</td>
                  <td className="px-6 py-4 text-center font-semibold font-mono text-emerald-600">{link.conversions}</td>
                  <td className="px-6 py-4 font-mono font-medium text-emerald-600">${Number(link.earned).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 hover:text-slate-900 text-slate-500 hover:bg-slate-100 transition active:scale-90">
                        {copiedId === link.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <a href={link.trackingUrl} target="_blank" rel="noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 hover:text-slate-900 text-slate-500 hover:bg-slate-100 transition active:scale-90">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-full mb-2" />
              <div className="h-8 bg-slate-200 rounded w-full" />
            </div>
          ))
        ) : links.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            <Link2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            No links created yet. Tap &apos;Create Link&apos; to get started.
          </div>
        ) : links.map((link) => (
          <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-teal-600 text-xs">{link.uniqueCode}</span>
              <span className="text-slate-400 text-xs">{new Date(link.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-slate-400 text-xs truncate">{link.targetUrl}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="flex items-center gap-1 mb-1">
                  <MousePointerClick className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-500 text-xs">Total Clicks</span>
                </div>
                <p className="font-mono font-bold text-slate-900 text-sm">{link.totalClicks}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="flex items-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="text-slate-500 text-xs">Unique Clicks</span>
                </div>
                <p className="font-mono font-bold text-blue-600 text-sm">{link.uniqueClicks}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  <span className="text-slate-500 text-xs">Conversions</span>
                </div>
                <p className="font-mono font-bold text-emerald-600 text-sm">{link.conversions}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-emerald-600" />
                  <span className="text-slate-500 text-xs">Earned</span>
                </div>
                <p className="font-mono font-bold text-emerald-600 text-sm">${Number(link.earned).toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-sm transition active:scale-95">
                {copiedId === link.id ? <><Check className="h-4 w-4 text-emerald-600" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
              </button>
              <a href={link.trackingUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-sm transition active:scale-95">
                <ExternalLink className="h-4 w-4" /> Test
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />

          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Generate Tracking Link</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm mb-1">Link Created Successfully!</h5>
                    Send traffic to this URL to start earning.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Your Traffic URL
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="font-mono text-xs text-teal-600 select-all truncate flex-1 pl-1.5">
                      {createdLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdLink, 'modal-copy')}
                      className="p-2 bg-white hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 border border-slate-200 transition active:scale-95 shrink-0"
                    >
                      {copiedId === 'modal-copy' ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 text-center bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 hover:text-slate-900 font-semibold text-sm transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLink} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Target URL</label>
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com/landing-page"
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Enter the final destination URL you want to send traffic to.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-teal-600/10 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {creating ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    'Generate URL'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
