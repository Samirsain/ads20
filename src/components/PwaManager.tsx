'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Download, WifiOff, RefreshCw, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function getOnlineSnapshot() {
  return navigator.onLine
}

function subscribeNoop() {
  return () => {}
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installedViaEvent, setInstalledViaEvent] = useState(false)

  const standaloneInitial = useSyncExternalStore(
    subscribeNoop,
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false
  )

  const isIosSafari = useSyncExternalStore(
    subscribeNoop,
    () => {
      const ua = window.navigator.userAgent
      const isIos = /iPhone|iPad|iPod/i.test(ua)
      const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      return isIos && isSafari && !standalone
    },
    () => false
  )

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setInstalledViaEvent(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const isInstalled = standaloneInitial || installedViaEvent

  const triggerInstall = async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalledViaEvent(true)
      setDeferredPrompt(null)
      return true
    }
    return false
  }

  return {
    canNativeInstall: !isInstalled && deferredPrompt !== null,
    isIosSafari,
    isInstalled,
    triggerInstall,
  }
}

export function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const { canNativeInstall, isIosSafari, isInstalled, triggerInstall } = usePwaInstall()
  const [iosModalOpen, setIosModalOpen] = useState(false)

  if (isInstalled || (!canNativeInstall && !isIosSafari)) return null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (canNativeInstall) void triggerInstall()
          else setIosModalOpen(true)
        }}
        className={`flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-semibold ${
          compact ? 'px-3 py-2 text-xs' : 'w-full px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Install App</span>
      </button>

      {iosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Install Ads2Pub on iOS</h4>
              <button onClick={() => setIosModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In Safari, tap the <Share className="inline h-3.5 w-3.5 mx-0.5 text-blue-600" />{' '}
              <strong>Share</strong> button and choose <strong>Add to Home Screen</strong>.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default function PwaManager() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true)
  const offline = !isOnline
  const [updateWaiting, setUpdateWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost')) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting) setUpdateWaiting(reg.waiting)
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing
            if (!nw) return
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateWaiting(nw)
              }
            })
          })
        })
        .catch(() => {
          // Ignore SW registration failure in unsupported contexts
        })
    }
  }, [])

  const applyUpdate = () => {
    if (!updateWaiting) return
    updateWaiting.postMessage('SKIP_WAITING')
    window.location.reload()
  }

  return (
    <>
      {offline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 shadow-lg flex items-center justify-between gap-3 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              <strong>Offline:</strong> Financial actions &amp; live balances require internet.
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {updateWaiting && !offline && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-lg flex items-center gap-3 text-xs text-slate-700">
          <span>New version of Ads2Pub available</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
          >
            <RefreshCw className="h-3 w-3" /> Update
          </button>
        </div>
      )}
    </>
  )
}
