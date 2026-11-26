'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import LinkAnalyticsView, { type LinkAnalyticsPayload } from '@/components/LinkAnalyticsView'

export default function AdminLinkAnalyticsPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const linkId = params?.id
  const portalType = searchParams.get('type') === 'traffic' ? 'traffic' : 'publisher'

  const [data, setData] = useState<LinkAnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async () => {
    if (!linkId) return null
    const res = await fetch(`/api/admin/links/${linkId}?type=${portalType}`)
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load link analytics')
    }
    return json.data as LinkAnalyticsPayload
  }, [linkId, portalType])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadAnalytics())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [loadAnalytics])

  useEffect(() => {
    let active = true
    loadAnalytics()
      .then((d) => { if (active) setData(d) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Something went wrong') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadAnalytics])

  return (
    <LinkAnalyticsView
      data={data}
      loading={loading}
      error={error}
      backHref="/admin/links"
      backLabel="Back to All Links"
      onRefresh={() => void refresh()}
    />
  )
}

