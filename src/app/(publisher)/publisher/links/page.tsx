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
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load tracking links')
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
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create link')
      setCreatedLink(json.data.link)
      fetchLinks()
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

  useEffect(() => { fetchLinks() }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Link2 className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
            Monetized Links
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Generate and manage your tracking links</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLinks} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50 text-sm font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => { setCreatedLink(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-4 py-2 shadow-lg shadow-blue-600/10 active:scale-95 transition text-sm">
            <Plus className="h-4 w-4" />
            Create Link
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-5 py-4">Link Code / Target</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4 text-center">Clicks</th>
                <th className="px-5 py-4 text-center">Conversions</th>
                <th className="px-5 py-4">Earnings</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-5" colSpan={7}><div className="h-4 bg-slate-800/60 rounded w-full" /></td>
                  </tr>
                ))
              ) : links.length === 0 ? (
                <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={7}>
                  <Link2 className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  No links yet. Click &apos;Create Link&apos; to start.
                </td></tr>
              ) : links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-blue-400 text-xs">{link.uniqueCode}</span>
                    <div className="text-slate-500 text-xs mt-1 truncate max-w-[200px]">{link.targetUrl}</div>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-400 uppercase">{link.linkType}</td>
                  <td className="px-5 py-4 text-center font-mono font-semibold">{link.clicks}</td>
                  <td className="px-5 py-4 text-center font-mono font-semibold text-emerald-400">{link.conversions}</td>
                  <td className="px-5 py-4 font-mono text-emerald-400">₹{Number(link.earned).toFixed(2)}</td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{new Date(link.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-90">
                        {copiedId === link.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <a href={link.trackingUrl} target="_blank" rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-90">
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
            <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))
        ) : links.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <Link2 className="h-8 w-8 text-slate-700 mx-auto mb-2" />
            No links yet. Tap &apos;Create Link&apos; to start.
          </div>
        ) : links.map((link) => (
          <div key={link.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-blue-400 text-xs">{link.uniqueCode}</span>
                <p className="text-slate-500 text-xs mt-1 truncate">{link.targetUrl}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded shrink-0">{link.linkType}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/50 rounded-xl p-2">
                <div className="text-lg font-bold text-white">{link.clicks}</div>
                <div className="text-[10px] text-slate-500 uppercase">Clicks</div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-2">
                <div className="text-lg font-bold text-emerald-400">{link.conversions}</div>
                <div className="text-[10px] text-slate-500 uppercase">Conv.</div>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-2">
                <div className="text-lg font-bold text-emerald-400">₹{Number(link.earned).toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 uppercase">Earned</div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => copyToClipboard(link.trackingUrl, link.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition active:scale-95">
                {copiedId === link.id ? <><Check className="h-4 w-4 text-emerald-400" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
              </button>
              <a href={link.trackingUrl} target="_blank" rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Generate Tracking Link</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-xs flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white text-sm mb-1">Link Created!</h5>
                    Share this link — every registration earns you money.
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Link</label>
                  <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                    <span className="font-mono text-xs text-blue-400 select-all truncate flex-1 pl-1.5">{createdLink}</span>
                    <button onClick={() => copyToClipboard(createdLink, 'modal-copy')}
                      className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white border border-slate-800 transition shrink-0">
                      {copiedId === 'modal-copy' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white font-semibold text-sm transition">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLink} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {(['direct', 'smart'] as const).map((type) => (
                    <label key={type} className={`flex flex-col p-4 rounded-2xl border transition cursor-pointer ${
                      linkType === type ? 'border-blue-500 bg-blue-500/5 text-white' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-400'
                    }`}>
                      <input type="radio" name="linkType" value={type} checked={linkType === type} onChange={() => setLinkType(type)} className="sr-only" />
                      <span className="font-bold text-sm capitalize">{type} Link</span>
                      <span className="text-slate-500 text-xs mt-1 leading-relaxed">
                        {type === 'direct' ? 'Redirects to the default landing page.' : 'Uses device and referrer features.'}
                      </span>
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg active:scale-[0.98] transition disabled:opacity-50">
                  {creating ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating...</> : 'Generate URL'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
