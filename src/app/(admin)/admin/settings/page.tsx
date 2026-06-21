'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    landing_page_url: 'https://paisawin.online/register',
    postback_secret: 'pw_secret_changeme',
    pub_earn_amount: '0.05',
    traffic_earn_amount: '3.00',
    min_withdrawal: '50',
  })
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
          onClick={fetchSettings}
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
          description="The amount in INR credited to a publisher per signup referral conversion."
          value={settings.pub_earn_amount}
          onChange={(val) => setSettings((s) => ({ ...s, pub_earn_amount: val }))}
          onSave={() => saveSetting('pub_earn_amount', settings.pub_earn_amount)}
          saving={savingKey === 'pub_earn_amount'}
          loading={loading}
          placeholder="0.05"
        />

        <SettingInputCard
          title="Traffic Conversion Reward"
          description="The amount in INR credited to a traffic user per signup referral conversion."
          value={settings.traffic_earn_amount}
          onChange={(val) => setSettings((s) => ({ ...s, traffic_earn_amount: val }))}
          onSave={() => saveSetting('traffic_earn_amount', settings.traffic_earn_amount)}
          saving={savingKey === 'traffic_earn_amount'}
          loading={loading}
          placeholder="3.00"
        />

        <SettingInputCard
          title="Minimum Withdrawal Limit"
          description="The minimum wallet balance required for both publishers and traffic users to request a withdrawal."
          value={settings.min_withdrawal}
          onChange={(val) => setSettings((s) => ({ ...s, min_withdrawal: val }))}
          onSave={() => saveSetting('min_withdrawal', settings.min_withdrawal)}
          saving={savingKey === 'min_withdrawal'}
          loading={loading}
          placeholder="50"
        />
      </div>
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
