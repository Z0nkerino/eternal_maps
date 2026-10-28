import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { AppProvider, useApp } from './store'
import { searchPlaces, reverseGeocode } from './lib/api'
import { useIsDesktop } from './lib/useMedia'
import MapView from './components/MapView'
import CommandPalette, { SearchBar } from './components/CommandPalette'
import Controls from './components/Controls'
import PlaceCard from './components/PlaceCard'
import Toast from './components/Toast'
import UpdateToast from './components/UpdateToast'
import { BottomSheet, Sidebar, PEEK } from './components/Sheet'

// Deep links — Universal Planner opens events here with ?q=<place> or ?lat=&lng=(&name=).
function useDeepLink() {
  const { selectPlace, notify, mapApi, locate } = useApp()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    const lat = parseFloat(params.get('lat'))
    const lng = parseFloat(params.get('lng') ?? params.get('lon'))
    const name = params.get('name')
    const ready = () => new Promise((r) => { const tick = () => (mapApi.current ? r() : setTimeout(tick, 50)); tick() })

    ;(async () => {
      await ready()
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        const base = { id: `${lat.toFixed(5)},${lng.toFixed(5)}`, name: name || 'Shared location', address: '', lat, lng, kind: 'pin' }
        mapApi.current.jumpTo(base, 15)
        selectPlace(base)
        reverseGeocode(base).then((p) => selectPlace({ ...base, name: name || p.name || base.name, address: p.address }, { fly: false })).catch(() => {})
      } else if (q) {
        try {
          const [p] = await searchPlaces(q, { limit: 1 })
          if (p) selectPlace(p)
          else notify(`Couldn’t find “${q}”. Try searching for it.`)
        } catch {
          notify('Couldn’t open that place — you seem to be offline.')
        }
      } else {
        // Quietly centre on the person if they've already allowed location.
        navigator.permissions?.query({ name: 'geolocation' }).then((s) => s.state === 'granted' && locate({ quiet: true })).catch(() => {})
        return
      }
      history.replaceState(null, '', location.pathname)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function Shell() {
  const isDesktop = useIsDesktop()
  const [bearing, setBearing] = useState(0)
  useDeepLink()

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ '--peek': `calc(${PEEK}px + var(--safe-bottom))` }}>
      <h1 className="sr-only">Eternal Maps</h1>
      {/* UI comes first in the DOM so keyboard focus starts at search, not inside the map. */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {isDesktop ? (
          <>
            <Sidebar header={<SearchBar />} />
            <Controls bearing={bearing} className="absolute right-4 top-4" />
          </>
        ) : (
          <>
            <div className="pointer-events-auto absolute inset-x-3 top-[calc(var(--safe-top)+12px)] z-20"><SearchBar /></div>
            <Controls bearing={bearing} className="absolute right-3 top-[calc(var(--safe-top)+76px)] z-10" />
            <BottomSheet />
          </>
        )}
        <PlaceCard desktop={isDesktop} />
      </div>
      <MapView onBearing={setBearing} />
      <CommandPalette />
      <Toast />
      <UpdateToast />
      <div className="titlebar-drag" aria-hidden />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <Shell />
      </AppProvider>
    </MotionConfig>
  )
}
