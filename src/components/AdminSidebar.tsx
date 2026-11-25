'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { InstallAppButton } from '@/components/PwaManager'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  BarChart2,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  CalendarRange,
  CalendarClock,
} from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'Traffic Reports', icon: CalendarRange },
  { href: '/admin/settlement', label: 'Payout Batch', icon: CalendarClock },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: Wallet },
  { href: '/admin/publishers', label: 'Publishers', icon: Users },
  { href: '/admin/conversions', label: 'Conversions', icon: Activity },
  { href: '/admin/publisher-earnings', label: 'Pub Earnings', icon: BarChart2 },
  { href: '/admin/earnings', label: 'Traffic Earnings', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

// Public pages that share this layout but must not show the authenticated nav.
const publicPaths = ['/admin/login']

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // See PublisherSidebar: rendering the nav on a public page prefetches the
  // protected routes while logged out, and the resulting cached redirects
  // bounce the user back to login after a successful sign-in.
  if (publicPaths.includes(pathname)) return null

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Fallback
    }
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    try {
      sessionStorage.clear()
    } catch {
      // Ignore
    }
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <>
      {/* Unified Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:hidden">
        <button
          aria-label={open ? 'Close admin menu' : 'Open admin menu'}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-200"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">Ads2Pub</span>
          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <InstallAppButton compact />
      </header>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Ads2Pub</span>
          <span className="ml-auto text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">Admin</span>
        </div>

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
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <InstallAppButton />
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
