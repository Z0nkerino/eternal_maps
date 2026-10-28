import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { load, save } from './lib/storage'
import { getRoute, reverseGeocode, searchPlaces } from './lib/api'
import { haversine, formatDistance, formatDuration, parseCoords, uid } from './lib/geo'
import { parseCommand, AFINA_HELP } from './lib/afina'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export const DEFAULT_LISTS = [
  { id: 'home', name: 'Home', emoji: '🏠', builtin: true },
  { id: 'work', name: 'Work', emoji: '💼', builtin: true },
  { id: 'favorites', name: 'Favorites', emoji: '❤️', builtin: true },
  { id: 'want', name: 'Want to go', emoji: '⭐', builtin: true },
]

const DEFAULT_SETTINGS = { units: 'km', mode: 'walk', detailed: false, buildings3d: false }
export const MODE_LABEL = { walk: 'Walking', drive: 'Driving', cycle: 'Cycling' }

function usePersisted(key, initial) {
  const [value, setValue] = useState(() => load(key, initial))
  useEffect(() => save(key, value), [key, value])
  return [value, setValue]
}

function useSystemDark() {
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = (e) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

const NEARBY_ALIASES = {
  cafes: 'cafe', 'cafés': 'cafe', café: 'cafe', coffee: 'cafe', 'coffee shops': 'cafe', 'coffee shop': 'cafe',
  restaurants: 'restaurant', food: 'restaurant', bars: 'bar', pubs: 'pub', pharmacies: 'pharmacy', chemist: 'pharmacy',
  parks: 'park', gyms: 'gym', 'gas station': 'fuel', 'gas stations': 'fuel', 'petrol station': 'fuel', atm: 'atm', atms: 'atm',
  supermarkets: 'supermarket', groceries: 'supermarket', hotels: 'hotel', museums: 'museum', toilets: 'toilets', bakeries: 'bakery',
  hospitals: 'hospital', libraries: 'library', 'ev charging': 'charging station', chargers: 'charging station',
}
const normalizeNearby = (q) => NEARBY_ALIASES[q.toLowerCase()] || q.replace(/ies$/, 'y').replace(/(?<!s)s$/, '')

export function AppProvider({ children }) {
  // ── Persisted ──────────────────────────────────────────────
  const [theme, setTheme] = usePersisted('theme', 'system')
  const [settings, setSettings] = usePersisted('settings', DEFAULT_SETTINGS)
  const [lists, setLists] = usePersisted('lists', DEFAULT_LISTS)
  const [places, setPlaces] = usePersisted('places', [])
  const [recents, setRecents] = usePersisted('recents', [])
  const [routeHistory, setRouteHistory] = usePersisted('routes', [])
  const [afinaLog, setAfinaLog] = usePersisted('afina', [])

  // ── Session ────────────────────────────────────────────────
  const [selected, setSelected] = useState(null) // place shown in the place card
  const [results, setResults] = useState(null) // { title, items } — nearby / search results on the map
  const [route, setRoute] = useState(null) // { from, to, mode, ...osrm } | { loading } | { error }
  const [me, setMe] = useState(null) // { lat, lng, accuracy, heading }
  const [locStatus, setLocStatus] = useState('idle') // idle | locating | ok | denied | unavailable
  const [tab, setTab] = useState('explore')
  const [snap, setSnap] = useState('peek') // peek | half | full
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [afinaBusy, setAfinaBusy] = useState(false)
  const mapApi = useRef(null) // set by MapView: { flyTo, fitBounds, fitPoints, zoomBy, resetNorth, center }
  const routeAbort = useRef(null)
  const meRef = useRef(null)
  meRef.current = me

  const systemDark = useSystemDark()
  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    const r = document.documentElement
    r.classList.toggle('dark', dark)
    r.style.colorScheme = dark ? 'dark' : 'light'
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.removeAttribute('media')
      m.setAttribute('content', dark ? '#0A0A0A' : '#FFFFFF')
    })
  }, [dark])

  const notify = useCallback((text, tone = 'default') => {
    setToast({ id: uid(), text, tone })
  }, [])

  const fmt = useCallback((m) => formatDistance(m, settingsRef.current.units), [])

  // ── Location ───────────────────────────────────────────────
  const watchId = useRef(null)
  const locate = useCallback(({ fly = true, quiet = false } = {}) =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setLocStatus('unavailable')
        if (!quiet) notify('Location isn’t available on this device.')
        return resolve(null)
      }
      setLocStatus('locating')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading }
          setMe(p)
          setLocStatus('ok')
          if (fly) mapApi.current?.flyTo(p, Math.max(15, mapApi.current?.zoom?.() ?? 15))
          if (watchId.current == null) {
            watchId.current = navigator.geolocation.watchPosition(
              (w) => setMe({ lat: w.coords.latitude, lng: w.coords.longitude, accuracy: w.coords.accuracy, heading: w.coords.heading }),
              () => {},
              { enableHighAccuracy: true, maximumAge: 10000 },
            )
          }
          resolve(p)
        },
        (err) => {
          const denied = err.code === 1
          setLocStatus(denied ? 'denied' : 'unavailable')
          if (!quiet) notify(denied ? 'Location is off. You can turn it on in your browser settings.' : 'Couldn’t find you just now. Try again in a moment.')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
      )
    }), [notify])

  useEffect(() => () => watchId.current != null && navigator.geolocation.clearWatch(watchId.current), [])

  // ── Places ─────────────────────────────────────────────────
  const center = () => mapApi.current?.center?.() || null
  const nearRef = () => meRef.current || center()

  const selectPlace = useCallback((place, { fly = true, keepResults = false } = {}) => {
    if (!place) { setSelected(null); return }
    setSelected(place)
    if (!keepResults) setResults(null)
    if (fly) {
      if (place.bbox && Math.abs(place.bbox[1] - place.bbox[0]) > 0.02) mapApi.current?.fitBounds(place.bbox)
      else mapApi.current?.flyTo(place, Math.max(16, mapApi.current?.zoom?.() ?? 16), { offsetForSheet: true })
    }
    setRecents((r) => [{ ...place, bbox: null, at: Date.now() }, ...r.filter((x) => x.id !== place.id)].slice(0, 12))
    setSnap((s) => (s === 'full' ? 'half' : s))
  }, [setRecents])

  const dropPin = useCallback(async (lngLat) => {
    const base = { id: `${lngLat.lat.toFixed(5)},${lngLat.lng.toFixed(5)}`, name: 'Dropped pin', address: 'Looking up address…', lat: lngLat.lat, lng: lngLat.lng, kind: 'pin' }
    setSelected(base)
    setResults(null)
    try {
      const p = await reverseGeocode(lngLat)
      setSelected((cur) => (cur?.id === base.id ? { ...base, name: p.name && p.name !== p.address ? p.name : 'Dropped pin', address: p.address || '' } : cur))
    } catch {
      setSelected((cur) => (cur?.id === base.id ? { ...base, address: '' } : cur))
    }
  }, [])

  const savedFor = useCallback((p) => p && places.filter((s) => s.sourceId === p.id || (Math.abs(s.lat - p.lat) < 1e-5 && Math.abs(s.lng - p.lng) < 1e-5)), [places])

  const savePlace = useCallback((place, { listId = 'favorites', name } = {}) => {
    if (!place) return null
    const list = lists.find((l) => l.id === listId)
    // Home and Work hold a single place.
    const single = listId === 'home' || listId === 'work'
    const entry = { id: uid(), sourceId: place.id, name: name || (single ? list.name : place.name), address: place.address || '', lat: place.lat, lng: place.lng, kind: place.kind || '', listId, savedAt: Date.now() }
    setPlaces((ps) => [entry, ...ps.filter((p) => !(single && p.listId === listId) && !(p.listId === listId && p.sourceId === place.id))])
    notify(`Saved to ${list?.emoji ?? ''} ${list?.name ?? 'Saved'}`.replace('  ', ' '))
    return entry
  }, [lists, setPlaces, notify])

  const removePlace = useCallback((id) => setPlaces((ps) => ps.filter((p) => p.id !== id)), [setPlaces])
  const updatePlace = useCallback((id, patch) => setPlaces((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))), [setPlaces])

  const addList = useCallback((name, emoji) => {
    const l = { id: uid(), name: name.trim(), emoji: emoji || '📍' }
    setLists((ls) => [...ls, l])
    return l
  }, [setLists])
  const updateList = useCallback((id, patch) => setLists((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))), [setLists])
  const removeList = useCallback((id) => {
    setLists((ls) => ls.filter((l) => l.id !== id || l.builtin))
    setPlaces((ps) => ps.filter((p) => p.listId !== id))
  }, [setLists, setPlaces])

  const showResults = useCallback((title, items) => {
    setResults({ title, items })
    setSelected(null)
    if (items.length) mapApi.current?.fitPoints(items.concat(meRef.current ? [meRef.current] : []))
    setTab('explore')
    setSnap('half')
  }, [])

  // ── Routing ────────────────────────────────────────────────
  const startRoute = useCallback(async (to, { from = null, mode } = {}) => {
    mode = mode || settingsRef.current.mode
    let origin = from
    if (!origin) {
      origin = meRef.current || (await locate({ fly: false, quiet: true }))
      if (!origin) {
        setRoute({ error: 'Turn on location to route from where you are — or pick a starting point.', to, mode })
        setTab('routes'); setSnap('half')
        return null
      }
      origin = { ...origin, name: 'My location', id: 'me' }
    }
    routeAbort.current?.abort()
    const ctrl = new AbortController()
    routeAbort.current = ctrl
    setRoute({ loading: true, from: origin, to, mode })
    setTab('routes')
    setSnap('half')
    setSelected(null)
    setResults(null)
    try {
      const r = await getRoute(origin, to, mode, { signal: ctrl.signal })
      const full = { ...r, from: origin, to }
      setRoute(full)
      mapApi.current?.fitRoute(r.geometry.coordinates)
      setRouteHistory((h) => [{ id: uid(), from: { ...origin }, to: { ...to, bbox: null }, mode, distance: r.distance, duration: r.duration, at: Date.now() },
        ...h.filter((x) => !(x.to.id === to.id && x.mode === mode && x.from.id === origin.id))].slice(0, 15))
      return full
    } catch (e) {
      if (e.name === 'AbortError') return null
      setRoute({ error: e.message === 'no-route' ? `No ${MODE_LABEL[mode].toLowerCase()} route found between these places.` : 'Couldn’t reach the route service. Check your connection and try again.', from: origin, to, mode })
      return null
    }
  }, [locate, setRouteHistory])

  const clearRoute = useCallback(() => { routeAbort.current?.abort(); setRoute(null) }, [])

  // ── Search (palette + Afina) ───────────────────────────────
  const findPlace = useCallback(async (q) => {
    const lower = q.toLowerCase()
    const coords = parseCoords(q)
    if (coords) return { id: q, name: q, address: 'Coordinates', ...coords, kind: 'pin' }
    const saved = places.find((p) => p.name.toLowerCase() === lower) ||
      (['home', 'work'].includes(lower) && places.find((p) => p.listId === lower))
    if (saved) return { ...saved, id: saved.sourceId || saved.id }
    const res = await searchPlaces(q, { near: nearRef(), limit: 5 })
    if (!res.length) return null
    const n = nearRef()
    // Prefer the closest of the top few when we know where the person is.
    return n ? res.slice(0, 3).sort((a, b) => haversine(n, a) - haversine(n, b))[0] : res[0]
  }, [places])

  const searchNearby = useCallback(async (q) => {
    const origin = meRef.current || (await locate({ fly: false, quiet: true })) || center()
    const query = normalizeNearby(q)
    let items = await searchPlaces(query, { near: origin, bounded: true, limit: 15 })
    if (!items.length) items = await searchPlaces(`${query}`, { near: origin, limit: 10 })
    items = items.map((p) => ({ ...p, distance: haversine(origin, p) })).sort((a, b) => a.distance - b.distance)
    return { items, origin }
  }, [locate])

  // ── Afina ──────────────────────────────────────────────────
  const say = (role, text, extra = {}) => setAfinaLog((log) => [...log.slice(-60), { id: uid(), role, text, at: Date.now(), ...extra }])

  const runAfina = useCallback(async (text, { fromPalette = false, toast = false } = {}) => {
    const intent = parseCommand(text)
    if (intent.type === 'empty') return
    say('user', text.trim())
    setAfinaBusy(true)
    const started = Date.now()
    const reply = async () => {
      const name = (p) => p.name || 'that place'
      try {
        switch (intent.type) {
          case 'help': return AFINA_HELP
          case 'hello': return 'Hi! Where are we headed today?'
          case 'thanks': return 'Anytime.'
          case 'theme': setTheme(intent.value); return intent.value === 'system' ? 'Following your system theme.' : `${intent.value === 'dark' ? 'Dark' : 'Light'} mode is on.`
          case 'units': setSettings((s) => ({ ...s, units: intent.value })); return intent.value === 'mi' ? 'Distances are now in miles.' : 'Distances are now in kilometres.'
          case 'defaultMode': setSettings((s) => ({ ...s, mode: intent.value })); return `${MODE_LABEL[intent.value]} is your default now.`
          case 'zoom': mapApi.current?.zoomBy(intent.value); return intent.value > 0 ? 'Zoomed in.' : 'Zoomed out.'
          case 'north': mapApi.current?.resetNorth(); return 'North is up.'
          case 'toggle3d': setSettings((s) => ({ ...s, buildings3d: !s.buildings3d })); return `3D buildings ${settingsRef.current.buildings3d ? 'off' : 'on'}.`
          case 'clearRoute': clearRoute(); return 'Route cleared.'
          case 'tab': setTab(intent.value); setSnap('half'); return null
          case 'whereAmI': {
            const p = await locate({ quiet: true })
            if (!p) return 'I can’t see your location. Turn it on in your browser and ask again.'
            try {
              const r = await reverseGeocode(p)
              setSelected({ ...r, name: 'You are here', id: 'me' })
              return `You’re near ${r.address || r.name}.`
            } catch { return 'Here you are — I couldn’t look up the address right now.' }
          }
          case 'save': {
            let target = intent.here ? meRef.current || (await locate({ fly: false, quiet: true })) : selected
            if (!target) target = meRef.current
            if (!target) return 'Pick a place on the map first, then ask me to save it.'
            if (!target.id) target = { ...target, id: `${target.lat.toFixed(5)},${target.lng.toFixed(5)}`, name: 'My location', address: '' }
            if (intent.list) {
              const listName = intent.list.toLowerCase()
              let list = lists.find((l) => l.id === listName || l.name.toLowerCase() === listName)
              if (!list) list = addList(intent.list.replace(/^\w/, (c) => c.toUpperCase()), '📍')
              savePlace(target, { listId: list.id })
              return list.id === 'home' || list.id === 'work' ? `${list.name} is set to ${target.address || name(target)}.` : `Saved ${name(target)} to ${list.name}.`
            }
            const label = intent.name ? intent.name.replace(/^\w/, (c) => c.toUpperCase()) : undefined
            savePlace(target, { listId: 'favorites', name: label })
            return label ? `Saved as “${label}” in Favorites.` : `Saved ${name(target)} to Favorites.`
          }
          case 'distance': {
            const dest = await findPlace(intent.query)
            if (!dest) return `I couldn’t find “${intent.query}”.`
            const from = meRef.current || (await locate({ fly: false, quiet: true })) || center()
            selectPlace(dest)
            return `${name(dest)} is ${fmt(haversine(from, dest))} away in a straight line. Say “route there” for directions.`
          }
          case 'route': {
            let dest
            if (!intent.dest) dest = selected
            else if (/^(nearest|closest) /.test(intent.dest)) {
              const { items } = await searchNearby(intent.dest.replace(/^(nearest|closest) /, ''))
              dest = items[0]
            } else if (/^(home|work)$/.test(intent.dest)) {
              const p = places.find((s) => s.listId === intent.dest)
              if (!p) return `You haven’t set ${intent.dest} yet. Open a place and say “set as ${intent.dest}”.`
              dest = { ...p, id: p.sourceId || p.id }
            } else dest = await findPlace(intent.dest)
            if (!dest) return intent.dest ? `I couldn’t find “${intent.dest}”. Try a fuller name or address.` : 'Where to? Pick a place first, or say “route to …”.'
            const r = await startRoute(dest, { mode: intent.mode })
            if (!r) return `I couldn’t plan a route to ${name(dest)} right now.`
            return `${MODE_LABEL[r.mode]} to ${name(dest)}: ${formatDuration(r.duration)}, ${fmt(r.distance)}.`
          }
          case 'nearby': {
            const { items } = await searchNearby(intent.query)
            if (!items.length) return `No ${intent.query.toLowerCase()} nearby that I can find.`
            showResults(`${intent.query.replace(/^\w/, (c) => c.toUpperCase())} nearby`, items)
            return `Found ${items.length} — the closest is ${name(items[0])}, ${fmt(items[0].distance)} away.`
          }
          case 'search': {
            const items = await searchPlaces(intent.query, { near: nearRef(), limit: 8 })
            if (!items.length) return `Nothing found for “${intent.query}”.`
            if (items.length === 1 || fromPalette) { selectPlace(items[0]); return `Here’s ${name(items[0])}.` }
            showResults(`Results for “${intent.query}”`, items.map((p) => ({ ...p, distance: nearRef() ? haversine(nearRef(), p) : null })))
            return `I found ${items.length} places for “${intent.query}”.`
          }
          default: return AFINA_HELP
        }
      } catch {
        return 'I couldn’t reach the map service just now. Check your connection and try again.'
      }
    }
    const text2 = await reply()
    // A brief, calm pause so "Afina is thinking" never flickers.
    const wait = 450 - (Date.now() - started)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    if (text2) say('afina', text2)
    if (text2 && toast) notify(text2)
    setAfinaBusy(false)
    return text2
  }, [selected, lists, places, locate, findPlace, searchNearby, savePlace, addList, selectPlace, startRoute, clearRoute, showResults, setTheme, setSettings, fmt, notify])

  const value = useMemo(() => ({
    theme, setTheme, dark, settings, setSettings, fmt,
    lists, addList, updateList, removeList,
    places, savePlace, removePlace, updatePlace, savedFor,
    recents, setRecents, routeHistory, setRouteHistory,
    selected, selectPlace, setSelected, dropPin, results, setResults, showResults,
    route, startRoute, clearRoute, setRoute,
    me, locStatus, locate,
    tab, setTab, snap, setSnap, paletteOpen, setPaletteOpen,
    toast, setToast, notify,
    afinaLog, setAfinaLog, afinaBusy, runAfina,
    findPlace, searchNearby, mapApi,
  }), [theme, dark, settings, lists, places, recents, routeHistory, selected, results, route, me, locStatus, tab, snap, paletteOpen, toast, afinaLog, afinaBusy,
    setTheme, setSettings, fmt, addList, updateList, removeList, savePlace, removePlace, updatePlace, savedFor, setRecents, setRouteHistory, selectPlace, dropPin, showResults,
    startRoute, clearRoute, locate, notify, setAfinaLog, runAfina, findPlace, searchNearby])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
