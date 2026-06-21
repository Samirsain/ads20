'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Link2,
  TrendingUp,
  Wallet,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/traffic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/traffic/links', label: 'Traffic Links', icon: Link2 },
  { href: '/traffic/earnings', label: 'Earnings', icon: TrendingUp },
  { href: '/traffic/withdraw', label: 'Withdraw', icon: Wallet },
]

export default function TrafficSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    document.cookie = 'traffic_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/traffic/login')
  }

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-200 lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Ads2Pub</span>
          <span className="ml-auto text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Traffic</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
