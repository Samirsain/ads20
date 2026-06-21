import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <AdminSidebar />
      <main className="flex-1 min-w-0 lg:pl-64 min-h-screen p-4 pt-20 lg:pt-8 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
