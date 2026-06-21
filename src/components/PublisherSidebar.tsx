'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Link2,
  ArrowRightLeft,
  Wallet,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/publisher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/publisher/links', label: 'My Links', icon: Link2 },
  { href: '/publisher/conversions', label: 'Conversions', icon: ArrowRightLeft },
  { href: '/publisher/withdraw', label: 'Withdraw', icon: Wallet },
]

export default function PublisherSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    // Clear cookie by hitting auth logout or removing it client-side
    document.cookie = 'pub_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/publisher/login')
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Ads2Pub</span>
          <span className="ml-auto text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Publisher</span>
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
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
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
