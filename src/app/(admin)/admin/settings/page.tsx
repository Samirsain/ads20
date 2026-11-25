'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, AlertCircle, RefreshCw, Radio } from 'lucide-react'

interface PostbackLogEntry {
  at: string
  source: 'GET' | 'POST'
  code: string | null
  uid: string | null
  type: string | null
  secretMatched: boolean
  secretHint?: string
  result: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    landing_page_url: 'https://paisawin.online/register',
    postback_secret: 'pw_secret_changeme',
    pub_earn_amount: '0.05',
    traffic_earn_amount: '3.00',
    min_withdrawal: '15.00',
  })
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [postbackLog, setPostbackLog] = useState<PostbackLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(true)

  const fetchSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/config')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch settings')
      }
      setSettings((prev) => ({ ...prev, ...data.data }))
    } catch (err: any) {
      setError(err.message || 'Error loading configurations')
    } finally {
      setLoading(false)
    }
  }

  const fetchPostbackLog = async () => {
    setLogLoading(true)
    try {
      const res = await fetch('/api/admin/postback-log')
      const data = await res.json()
      if (res.ok && data.success) setPostbackLog(data.data || [])
    } catch {
      // Diagnostics only — a failure here should not block the settings page
    } finally {
      setLogLoading(false)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    setSavingKey(key)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      setSuccess(`Setting '${key}' saved successfully!`)
    } catch (err: any) {
      setError(err.message || `Error saving ${key}`)
    } finally {
      setSavingKey(null)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchPostbackLog()
  }, [])

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-violet-600" />
            Global Settings
          </h1>
          <p className="text-slate-500 mt-1">Configure conversion values, routing URLs, and payout rules</p>
        </div>
        <button
          onClick={() => {
            fetchSettings()
            fetchPostbackLog()
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {success}
        </div>
      )}

      {/* Settings Cards */}
      <div className="space-y-6">
        <SettingInputCard
          title="Landing Page Redirect URL"
          description="The direct destination URL where all referral links point to."
          value={settings.landing_page_url}
          onChange={(val) => setSettings((s) => ({ ...s, landing_page_url: val }))}
          onSave={() => saveSetting('landing_page_url', settings.landing_page_url)}
          saving={savingKey === 'landing_page_url'}
          loading={loading}
          placeholder="https://paisawin.online/register"
        />

        <SettingInputCard
          title="Postback API Secret Token"
          description="Secret token verifying postbacks from paisawin.online."
          value={settings.postback_secret}
          onChange={(val) => setSettings((s) => ({ ...s, postback_secret: val }))}
          onSave={() => saveSetting('postback_secret', settings.postback_secret)}
          saving={savingKey === 'postback_secret'}
          loading={loading}
          placeholder="pw_secret_changeme"
        />

        <SettingInputCard
          title="Publisher Conversion Reward"
          description="The amount in USD ($) credited per validated publisher signup conversion."
          value={settings.pub_earn_amount}
          onChange={(val) => setSettings((s) => ({ ...s, pub_earn_amount: val }))}
          onSave={() => saveSetting('pub_earn_amount', settings.pub_earn_amount)}
          saving={savingKey === 'pub_earn_amount'}
          loading={loading}
          placeholder="0.05"
        />

        <SettingInputCard
          title="Traffic Conversion Reward"
          description="The amount in USD ($) credited per validated traffic signup conversion."
          value={settings.traffic_earn_amount}
          onChange={(val) => setSettings((s) => ({ ...s, traffic_earn_amount: val }))}
          onSave={() => saveSetting('traffic_earn_amount', settings.traffic_earn_amount)}
          saving={savingKey === 'traffic_earn_amount'}
          loading={loading}
          placeholder="3.00"
        />

        <SettingInputCard
          title="Minimum Withdrawal Limit (USD)"
          description="Minimum settled available balance required to request a daily withdrawal (enforced floor: $15.00)."
          value={settings.min_withdrawal}
          onChange={(val) => setSettings((s) => ({ ...s, min_withdrawal: val }))}
          onSave={() => saveSetting('min_withdrawal', settings.min_withdrawal)}
          saving={savingKey === 'min_withdrawal'}
          loading={loading}
          placeholder="15.00"
        />

        <PostbackLogCard
          entries={postbackLog}
          loading={logLoading}
          onRefresh={fetchPostbackLog}
        />
      </div>
    </div>
  )
}

function PostbackLogCard({
  entries,
  loading,
  onRefresh,
}: {
  entries: PostbackLogEntry[]
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Radio className="h-4 w-4 text-violet-600" />
            Recent Postback Activity
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            The last 25 postbacks received from external platforms. An empty list means nothing is
            calling <span className="font-mono">/api/postback</span> at all.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition active:scale-90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-400 text-sm">
          No postback has reached the server yet. Verify that the external platform sends the
          conversion callback with the tracking code it received in the <span className="font-mono">ref</span> parameter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">UID</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Secret sent</th>
                <th className="py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {entries.map((entry, i) => (
                <tr key={`${entry.at}-${i}`}>
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-500">
                    {new Date(entry.at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 font-mono">{entry.code ?? '—'}</td>
                  <td className="py-2 pr-3 font-mono">{entry.uid ?? '—'}</td>
                  <td className="py-2 pr-3">{entry.type ?? '—'}</td>
                  <td className={`py-2 pr-3 font-mono ${entry.secretMatched ? 'text-slate-500' : 'text-red-600'}`}>
                    {entry.secretHint ?? '—'}
                  </td>
                  <td
                    className={`py-2 font-semibold ${
                      entry.result.startsWith('credited') ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {entry.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface SettingCardProps {
  title: string
  description: string
  value: string
  onChange: (val: string) => void
  onSave: () => void
  saving: boolean
  loading: boolean
  placeholder: string
}

function SettingInputCard({
  title,
  description,
  value,
  onChange,
  onSave,
  saving,
  loading,
  placeholder,
}: SettingCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-slate-500 text-xs mt-1">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          value={loading ? 'Loading...' : value}
          disabled={loading || saving}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-white border border-slate-300 focus:border-violet-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition disabled:opacity-50 text-sm font-mono"
        />
        <button
          onClick={onSave}
          disabled={loading || saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl px-5 py-3 shadow-lg shadow-violet-600/10 active:scale-95 transition disabled:opacity-50 select-none text-sm shrink-0"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  )
}
