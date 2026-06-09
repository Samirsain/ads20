import PublisherSidebar from '@/components/PublisherSidebar'

export default function PublisherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <PublisherSidebar />
      <main className="flex-1 lg:pl-64 min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
