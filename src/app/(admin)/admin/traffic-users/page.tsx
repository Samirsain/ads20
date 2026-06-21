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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-emerald-600" />
            Traffic Users
          </h1>
          <p className="text-slate-500 mt-1">Manage traffic portal user accounts and active statuses</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex bg-white border border-slate-200 rounded-2xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search traffic users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-violet-500 rounded-xl pl-11 pr-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4">Links Created</th>
                <th className="px-6 py-4">Conversions</th>
                <th className="px-6 py-4">Joined At</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={7}>
                      <div className="h-5 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400" colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                      <span>No traffic users found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{user.email}</div>
                        {user.phone && <div className="text-slate-400 text-xs">{user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      ${Number(user.walletBalance).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-medium">{user._count.trafficLinks}</td>
                    <td className="px-6 py-4 font-medium text-emerald-600">{user._count.earnings}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          user.isActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
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
                            ? 'bg-red-50 hover:bg-red-600 hover:text-white border-red-200 text-red-600 hover:border-red-600'
                            : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-200 text-emerald-600 hover:border-emerald-600'
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
