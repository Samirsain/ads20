'use client'

import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, RefreshCw, X, Link2, AlertCircle, Loader2 } from 'lucide-react'

interface TrackingLink {
  id: string
  uniqueCode: string
  targetUrl: string
  linkType: string
  clicks: number
  conversions: number
  earned: number
  createdAt: string
  trackingUrl: string
}

export default function PublisherLinksPage() {
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [linkType, setLinkType] = useState<'direct' | 'smart'>('direct')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)

  const fetchLinks = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/publisher/links')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load tracking links')
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
      const res = await fetch('/api/publisher/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkType }),
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
            <Link2 className="h-8 w-8 text-blue-500" />
            Monetized Links
          </h1>
          <p className="text-slate-400 mt-1">Generate tracking links and monitor registration statistics</p>
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
              setCreatedLink(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-5 py-2.5 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 transition text-sm"
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
                <th className="px-6 py-4">Link Type</th>
                <th className="px-6 py-4 text-center">Clicks</th>
                <th className="px-6 py-4 text-center">Conversions</th>
                <th className="px-6 py-4">Earnings</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={7}>
                      <div className="h-5 bg-slate-800/60 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Link2 className="h-8 w-8 text-slate-700" />
                      <span>No links created yet. Click &apos;Create Link&apos; to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-blue-400 text-xs">
                          {link.uniqueCode}
                        </span>
                        <div className="text-slate-500 text-xs mt-1.5 truncate max-w-[250px]" title={link.targetUrl}>
                          {link.targetUrl}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="uppercase tracking-wider text-xs font-bold text-slate-400">
                        {link.linkType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-slate-100">{link.clicks}</td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-emerald-400">
                      {link.conversions}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                      ₹{Number(link.earned).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(link.createdAt).toLocaleDateString()}
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
                    Any visitors registering via this code will credit your wallet.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Referral Link URL
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-850 rounded-xl p-2.5">
                    <span className="font-mono text-xs text-blue-400 select-all truncate flex-1 pl-1.5">
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
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-300">Link Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex flex-col p-4 rounded-2xl border transition cursor-pointer select-none ${
                      linkType === 'direct'
                        ? 'border-blue-500 bg-blue-500/5 text-white'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="linkType"
                        value="direct"
                        checked={linkType === 'direct'}
                        onChange={() => setLinkType('direct')}
                        className="sr-only"
                      />
                      <span className="font-bold text-sm">Direct Link</span>
                      <span className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Redirects directly to the default landing page.
                      </span>
                    </label>

                    <label className={`flex flex-col p-4 rounded-2xl border transition cursor-pointer select-none ${
                      linkType === 'smart'
                        ? 'border-blue-500 bg-blue-500/5 text-white'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="linkType"
                        value="smart"
                        checked={linkType === 'smart'}
                        onChange={() => setLinkType('smart')}
                        className="sr-only"
                      />
                      <span className="font-bold text-sm">Smart Link</span>
                      <span className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Utilizes interactive device and referrer features.
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-blue-600/10 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
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
