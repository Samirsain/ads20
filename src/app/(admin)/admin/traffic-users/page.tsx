'use client'

import { useEffect, useState } from 'react'
import { Users, CheckCircle, XCircle, Search, RefreshCw, AlertCircle } from 'lucide-react'

interface TrafficUser {
  id: string
  email: string
  name: string
  phone: string | null
  walletBalance: string
  isActive: boolean
  createdAt: string
  _count: {
    trafficLinks: number
    earnings: number
  }
}

export default function AdminTrafficUsersPage() {
  const [users, setUsers] = useState<TrafficUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/traffic-users')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch traffic users')
      }
      setUsers(data.data.trafficUsers || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    setActionLoadingId(id)
    try {
      const res = await fetch('/api/admin/traffic-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update traffic user status')
      }

      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, isActive: !currentStatus } : user))
      )
    } catch (err: any) {
      alert(err.message || 'Error updating traffic user')
    } finally {
      setActionLoadingId(null)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-emerald-500" />
            Traffic Users
          </h1>
          <p className="text-slate-400 mt-1">Manage traffic portal user accounts and active statuses</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search traffic users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-violet-500 rounded-xl pl-11 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/25">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4">Links Created</th>
                <th className="px-6 py-4">Conversions</th>
                <th className="px-6 py-4">Joined At</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-600" />
                      <span>No traffic users found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-white">{user.name}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{user.email}</div>
                        {user.phone && <div className="text-slate-500 text-xs">{user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-100">
                      ₹{Number(user.walletBalance).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-medium">{user._count.trafficLinks}</td>
                    <td className="px-6 py-4 font-medium text-emerald-400">{user._count.earnings}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          user.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Deactivated
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActiveStatus(user.id, user.isActive)}
                        disabled={actionLoadingId === user.id}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border active:scale-95 transition disabled:opacity-50 ${
                          user.isActive
                            ? 'bg-red-500/10 hover:bg-red-500 hover:text-white border-red-500/25 text-red-400 hover:border-red-500'
                            : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/25 text-emerald-400 hover:border-emerald-500'
                        }`}
                      >
                        {actionLoadingId === user.id
                          ? 'Updating...'
                          : user.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
