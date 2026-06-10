'use client'

import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, RefreshCw, X, Link2, AlertCircle } from 'lucide-react'

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
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Link2 className="h-8 w-8 text-teal-500" />
            Traffic Links
          </h1>
          <p className="text-slate-400 mt-1">Manage URLs you are sending traffic to and monitor clicks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLinks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 text-sm font-semibold"
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
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Links List */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-6 py-4">Link Code / Target</th>
                <th className="px-6 py-4 text-center">Total Clicks</th>
                <th className="px-6 py-4 text-center">Unique Clicks</th>
                <th className="px-6 py-4 text-center">Conversions</th>
                <th className="px-6 py-4">Earnings</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={6}>
                      <div className="h-5 bg-slate-800/60 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={6}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Link2 className="h-8 w-8 text-slate-700" />
                      <span>No links created yet. Click 'Create Link' to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-teal-400 text-xs">
                          {link.uniqueCode}
                        </span>
                        <div className="text-slate-500 text-xs mt-1.5 truncate max-w-[250px]" title={link.targetUrl}>
                          {link.targetUrl}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-slate-100">{link.totalClicks}</td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-blue-400">{link.uniqueClicks}</td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-emerald-400">
                      {link.conversions}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                      ${Number(link.earned).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 hover:text-white text-slate-400 hover:bg-slate-800 transition active:scale-90"
                          title="Copy Link"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={link.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 hover:text-white text-slate-400 hover:bg-slate-800 transition active:scale-90"
                          title="Test Link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />

          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Generate Tracking Link</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-xs flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white text-sm mb-1">Link Created Successfully!</h5>
                    Send traffic to this URL to start earning.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Your Traffic URL
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-850 rounded-xl p-2.5">
                    <span className="font-mono text-xs text-teal-400 select-all truncate flex-1 pl-1.5">
                      {createdLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdLink, 'modal-copy')}
                      className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white border border-slate-800 transition active:scale-95 shrink-0"
                    >
                      {copiedId === 'modal-copy' ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 text-center bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-300 hover:text-white font-semibold text-sm transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLink} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Target URL</label>
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com/landing-page"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                  />
                  <p className="text-xs text-slate-500 mt-2">
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
