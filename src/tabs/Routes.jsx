import { useEffect, useState } from 'react'
import { ArrowDownUp, ArrowLeft, ArrowRight, ArrowUp, CornerUpLeft, CornerUpRight, Flag, Loader2, LocateFixed, MapPin, Navigation, RotateCcw, Undo2, X, Clock, CircleDot } from 'lucide-react'
import { useApp, MODE_LABEL } from '../store'
import { searchPlaces } from '../lib/api'
import { arrivalTime, formatDuration } from '../lib/geo'
import { Button, Empty, Row, Segmented, SectionTitle} from '../components/ui'
import { MODE_ICON } from '../components/PlaceCard'

const SHORT = { walk: 'Walk', cycle: 'Cycle', drive: 'Drive' }
const MODES = ['walk', 'cycle', 'drive'].map((m) => ({ value: m, label: SHORT[m], icon: MODE_ICON[m] }))

function stepIcon(s) {
  if (s.type === 'arrive') return Flag
  if (s.type === 'depart') return CircleDot
  if (s.type === 'roundabout' || s.type === 'rotary') return RotateCcw
  if (s.modifier === 'uturn') return Undo2
  if (s.modifier.includes('sharp left') || s.modifier === 'left') return ArrowLeft
  if (s.modifier.includes('sharp right') || s.modifier === 'right') return ArrowRight
  if (s.modifier.includes('slight left')) return CornerUpLeft
  if (s.modifier.includes('slight right')) return CornerUpRight
  return ArrowUp
}

function PlaceField({ label, value, onChange, allowMe, autoFocus }) {
  const { me, mapApi, places } = useApp()
  const [text, setText] = useState(value?.name || '')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => setText(value?.name || ''), [value])

  useEffect(() => {
    const q = text.trim()
    if (!open || q.length < 2 || q === value?.name) { setItems([]); return }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await searchPlaces(q, { near: me || mapApi.current?.center(), limit: 5, signal: ctrl.signal })
        setItems(res)
      } catch { /* quiet — the list stays empty */ }
      setLoading(false)
    }, 300)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [text, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const saved = text.trim() ? places.filter((p) => p.name.toLowerCase().includes(text.trim().toLowerCase())).slice(0, 3) : places.slice(0, 3)
  const pick = (p) => { onChange(p); setText(p.name); setOpen(false) }

  return (
    <div className="relative">
      <label className="flex h-12 items-center gap-3 rounded-[16px] px-3.5 focus-within:bg-fg/[.04]">
        <span className="w-10 shrink-0 text-[13px] font-medium text-fg/45">{label}</span>
        <input
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => { setText(e.target.value); setOpen(true) }}
          onFocus={(e) => { setOpen(true); e.target.select() }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter' && items[0]) pick(items[0]); if (e.key === 'Escape') setOpen(false) }}
          placeholder={allowMe ? 'My location' : 'Search destination'}
          aria-label={label === 'From' ? 'Starting point' : 'Destination'}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-fg/40" aria-label="Searching" />}
      </label>
      {open && (items.length > 0 || (allowMe && value?.id !== 'me') || saved.length > 0) && (
        <div className="glass-strong absolute inset-x-0 top-[calc(100%+4px)] z-10 max-h-64 overflow-y-auto rounded-[20px] p-1.5" role="listbox">
          {allowMe && value?.id !== 'me' && (
            <Row onMouseDown={(e) => e.preventDefault()} onClick={() => pick(null)} leading={<LocateFixed className="h-[18px] w-[18px] text-[var(--blue)]" />} title="My location" />
          )}
          {!items.length && saved.map((p) => (
            <Row key={p.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pick({ ...p, id: p.sourceId || p.id })} leading={<MapPin className="h-[18px] w-[18px] text-fg/55" />} title={p.name} subtitle={p.address} />
          ))}
          {items.map((p) => (
            <Row key={p.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)} leading={<MapPin className="h-[18px] w-[18px] text-fg/55" />} title={p.name} subtitle={p.address} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Routes() {
  const { route, startRoute, clearRoute, settings, fmt, routeHistory, setRouteHistory, mapApi } = useApp()
  const [from, setFrom] = useState(null) // null = my location
  const [to, setTo] = useState(null)
  const [mode, setMode] = useState(settings.mode)

  useEffect(() => {
    if (!route) return
    setFrom(route.from?.id === 'me' ? null : route.from || null)
    setTo(route.to || null)
    setMode(route.mode)
  }, [route?.from, route?.to, route?.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (f = from, t = to, m = mode) => { if (t) startRoute(t, { from: f, mode: m }) }

  const swap = () => {
    if (!to) return
    const nf = to
    const nt = from || (route?.from?.id === 'me' ? route.from : null)
    if (!nt) { setFrom(nf); setTo(null); return }
    setFrom(nf); setTo(nt); go(nf, nt)
  }

  const ready = route && !route.loading && !route.error && route.geometry

  return (
    <div className="scroll-y flex-1 px-3 pb-6 pt-3">
      <div className="tile relative rounded-[22px] p-1">
        <PlaceField label="From" value={from || { id: 'me', name: 'My location' }} allowMe onChange={(p) => { setFrom(p); if (to) go(p, to) }} />
        <div className="mx-3.5 h-px bg-fg/[.07]" />
        <PlaceField label="To" value={to} onChange={(p) => { setTo(p); go(from, p) }} />
        <button type="button" onClick={swap} aria-label="Swap start and destination" disabled={!to}
          className="glass-strong tap absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-40">
          <ArrowDownUp className="h-[18px] w-[18px]" />
        </button>
      </div>

      <Segmented className="mt-3" label="Travel mode" value={mode} onChange={(m) => { setMode(m); go(from, to, m) }} options={MODES} />

      {route?.loading && (
        <div className="mt-4 flex items-center gap-3 px-2 py-4 text-[15px] text-fg/60" role="status">
          <Loader2 className="h-5 w-5 animate-spin" /> Finding the calmest way…
        </div>
      )}

      {route?.error && (
        <div className="tile mt-4 rounded-[22px] p-4" role="alert">
          <p className="text-[15px] font-semibold">No route just yet</p>
          <p className="mt-1 text-[14px] text-fg/60">{route.error}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => go(from, route.to || to, route.mode)}>Try again</Button>
            <Button size="sm" variant="ghost" onClick={clearRoute}>Dismiss</Button>
          </div>
        </div>
      )}

      {ready && (
        <>
          <div className="tile mt-4 rounded-[22px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[30px] font-semibold leading-none tracking-[-.02em]"><span className="brand-text">{formatDuration(route.duration)}</span></p>
                <p className="mt-1.5 text-[14px] text-fg/60">{fmt(route.distance)} · arrive {arrivalTime(route.duration)}</p>
              </div>
              <button type="button" onClick={clearRoute} aria-label="End route" className="tap -mr-2 -mt-2 flex items-center justify-center rounded-full text-fg/50 hover:text-fg">
                <span className="tile flex h-8 w-8 items-center justify-center rounded-full"><X className="h-4 w-4" /></span>
              </button>
            </div>
            <p className="mt-3 truncate text-[13px] text-fg/50">{MODE_LABEL[route.mode]} to {route.to.name}</p>
            <Button variant="primary" className="mt-3 w-full" icon={Navigation} onClick={() => mapApi.current?.fitRoute(route.geometry.coordinates)}>Show whole route</Button>
          </div>
          <SectionTitle>Steps</SectionTitle>
          <ol>
            {route.steps.map((s, i) => {
              const Icon = stepIcon(s)
              return (
                <li key={i}>
                  <Row onClick={() => mapApi.current?.flyTo(s.location, 17)} leading={<Icon className="h-[18px] w-[18px] text-fg/70" strokeWidth={2.1} />} title={s.text}
                    subtitle={s.type !== 'arrive' && s.distance > 0 ? `then ${fmt(s.distance)}` : null} className="items-start [&_.truncate]:whitespace-normal" />
                </li>
              )
            })}
          </ol>
          <p className="mt-3 px-2 text-[12px] text-fg/40">Routes by OSRM on OpenStreetMap data. Always follow local signs.</p>
        </>
      )}

      {!route && (
        <>
          <SectionTitle action={routeHistory.length > 0 && <button type="button" onClick={() => setRouteHistory([])} className="rounded-full px-2 py-1 text-[13px] font-medium text-fg/50 hover:text-fg">Clear</button>}>Recent routes</SectionTitle>
          {routeHistory.length === 0 ? (
            <Empty icon={Navigation} title="Where to?">Pick a destination above, or open any place and tap Route.</Empty>
          ) : (
            <ul>
              {routeHistory.slice(0, 8).map((r) => {
                const Icon = MODE_ICON[r.mode]
                return (
                  <li key={r.id}>
                    <Row onClick={() => startRoute(r.to, { from: r.from.id === 'me' ? null : r.from, mode: r.mode })} leading={<Icon className="h-[18px] w-[18px] text-fg/65" />}
                      title={r.to.name} subtitle={`From ${r.from.name} · ${formatDuration(r.duration)} · ${fmt(r.distance)}`}
                      trailing={<Clock className="h-4 w-4 shrink-0 text-fg/30" aria-hidden />} />
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
