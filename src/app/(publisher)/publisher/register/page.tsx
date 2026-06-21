'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function PublisherRegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/publisher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed')
      }

      router.push('/publisher/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 mb-3">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Publisher Signup</h1>
          <p className="text-slate-500 text-sm mt-1">Create an account to monetize your traffic</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm"
              placeholder="+91 XXXXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 pr-11 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl py-3 shadow-lg shadow-blue-600/15 hover:shadow-blue-600/25 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registering...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/publisher/login" className="text-blue-600 hover:underline font-semibold">
            Login Here
          </Link>
        </div>
      </div>
    </div>
  )
}
