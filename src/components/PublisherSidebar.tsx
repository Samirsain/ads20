'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { InstallAppButton } from '@/components/PwaManager'
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
  { href: '/publisher/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { href: '/publisher/links', label: 'My Links', shortLabel: 'Links', icon: Link2 },
  { href: '/publisher/earnings', label: 'Earnings', shortLabel: 'Earnings', icon: TrendingUp },
  { href: '/publisher/withdraw', label: 'Withdraw', shortLabel: 'Withdraw', icon: Wallet },
]

// Public pages that share this layout but must not show the authenticated nav.
const publicPaths = ['/publisher/login', '/publisher/register']

export default function PublisherSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (publicPaths.includes(pathname)) return null

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Fallback cookie clear below
    }
    document.cookie = 'pub_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    try {
      sessionStorage.clear()
    } catch {
      // Ignore storage access errors
    }
    router.push('/publisher/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:hidden">
        <button
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-200"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#155EEF] to-[#06B6D4]">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-[#101828] text-sm">Ads2Pub</span>
        </div>
        <InstallAppButton compact />
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#155EEF] to-[#06B6D4]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-[#101828]">Ads2Pub</span>
          <span className="ml-auto text-xs font-medium text-[#155EEF] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            Publisher
          </span>
        </div>

        <nav aria-label="Publisher Navigation" className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#155EEF] to-[#06B6D4] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#101828]'
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

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {navItems.map(({ href, shortLabel, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-[64px] text-[11px] font-semibold transition ${
                active ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
