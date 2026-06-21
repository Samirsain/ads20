'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Target, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function TrafficRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/traffic/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed')
      }

      router.push('/traffic/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center relative overflow-hidden -m-4 md:-m-8 bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-teal-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative z-10 my-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20 mb-3">
            <Target className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Traffic Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join as a traffic provider and earn</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
              placeholder="traffic@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number (Optional)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
              placeholder="+1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Must be at least 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-medium rounded-xl py-3 shadow-lg shadow-teal-600/15 hover:shadow-teal-600/25 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/traffic/login" className="text-teal-600 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
