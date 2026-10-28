import { useSyncExternalStore } from 'react'

// Native shells, mirroring Universal Planner:
// - Mac/Windows: the Electron shell exposes `window.desktop` (see electron/preload.cjs).
// - Android and iPhone: Capacitor exposes `window.Capacitor`.
// - Anywhere else it's the web app, which updates itself through its service worker.

/** Present only inside the Mac/Windows desktop app. */
export const desktop = globalThis.desktop

const capacitor = globalThis.Capacitor
const nativePlatform = capacitor?.isNativePlatform?.() ? capacitor.getPlatform?.() : null
/** True inside the Android app. */
export const android = nativePlatform === 'android'
/** True inside the iPhone/iPad app. */
export const ios = nativePlatform === 'ios'
/** True inside either phone app. */
export const mobileApp = android || ios

export const APP_VERSION = __APP_VERSION__
/** The hosted web app — share links point here so they open on any device. */
export const WEB_URL = __WEB_URL__

const FEED = `https://github.com/${__UPDATE_REPO__}/releases/latest/download/latest.json`

/** a > b for plain x.y.z versions. */
export function isNewer(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}

function createStore() {
  return { status: { state: 'idle' }, listeners: new Set() }
}

/** Android and iPhone: read the same release feed as the desktop apps and offer the new APK / IPA. */
function mobileUpdater() {
  const key = android ? 'android' : 'ios'
  const store = createStore()
  const set = (s) => {
    store.status = { ...s, current: APP_VERSION }
    store.listeners.forEach((cb) => cb(store.status))
    return store.status
  }
  const check = async () => {
    set({ state: 'checking' })
    try {
      // Native HTTP, because GitHub's download redirects have no CORS headers.
      const http = capacitor?.Plugins?.CapacitorHttp
      const res = http
        ? await http.get({ url: FEED, responseType: 'json' })
        : await fetch(FEED, { cache: 'no-store' }).then(async (r) => ({ status: r.status, data: await r.json() }))
      const feed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      if (res.status !== 200 || !feed?.version) throw new Error('no-feed')
      if (isNewer(feed.version, APP_VERSION) && feed.downloads?.[key]) return set({ state: 'installer', version: feed.version, notes: feed.notes, url: feed.downloads[key] })
      return set({ state: 'current', version: APP_VERSION })
    } catch {
      return set({ state: 'error', message: 'Couldn’t check for updates. Are you online?' })
    }
  }
  return {
    status: async () => store.status,
    check,
    apply: async () => {},
    // Leaving the app's own origin hands the link to the system browser, which downloads the installer.
    download: async (url) => void (window.location.href = url),
    onStatus: (cb) => (store.listeners.add(cb), () => store.listeners.delete(cb)),
  }
}

/** Whatever can update this copy of the app: the desktop shell, the Android app, or nothing (the web app updates itself). */
export const appUpdater = desktop?.updates ?? (mobileApp ? mobileUpdater() : undefined)

// Shared update state for the toast and Settings.
const updates = { status: { state: 'idle' }, dismissed: null, listeners: new Set() }
const emit = () => updates.listeners.forEach((cb) => cb())
const setStatus = (status) => { updates.status = status; emit() }

export function useUpdates() {
  useSyncExternalStore(
    (cb) => (updates.listeners.add(cb), () => updates.listeners.delete(cb)),
    () => updates.status,
  )
  const dismissed = useSyncExternalStore(
    (cb) => (updates.listeners.add(cb), () => updates.listeners.delete(cb)),
    () => updates.dismissed,
  )
  return {
    status: updates.status,
    dismissed,
    dismiss: () => { updates.dismissed = updates.status.version ?? null; emit() },
  }
}

if (appUpdater) {
  void appUpdater.status().then(setStatus)
  appUpdater.onStatus(setStatus)
  if (mobileApp) {
    void appUpdater.check()
    setInterval(() => void appUpdater.check(), 6 * 3600_000)
  }
}

/** Saves a text file through a normal download (Electron asks where to save it). */
export function saveTextFile(name, text, type = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
