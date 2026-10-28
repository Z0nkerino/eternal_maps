import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Clock, Coffee, Compass, Home, LocateFixed, MapPin, Moon, Navigation, Search, Settings, Sparkles, Sun, Bookmark, X, Loader2, Briefcase } from 'lucide-react'
import { useApp } from '../store'
import { searchPlaces } from '../lib/api'
import { haversine, parseCoords } from '../lib/geo'
import { spring } from '../lib/motion'
import { cx, Mark } from './ui'

export function SearchBar() {
  const { setPaletteOpen, paletteOpen } = useApp()
  return (
    <motion.button
      type="button"
      onClick={() => setPaletteOpen(true)}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      aria-label="Search places or type a command"
      aria-haspopup="dialog"
      aria-expanded={paletteOpen}
      className="glass-strong flex h-[52px] w-full items-center gap-3 rounded-full pl-4 pr-2 text-left"
    >
      <Search className="h-[19px] w-[19px] shrink-0 text-fg/55" strokeWidth={2.1} aria-hidden />
      <span className="flex-1 truncate text-[16px] text-fg/45">Search places or type a command…</span>
      <kbd className="tile hidden h-7 items-center rounded-full px-2.5 text-[12px] font-medium text-fg/50 md:flex">⌘K</kbd>
      <span className="brand-fill flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-hidden>
        <Mark className="h-[18px] w-[18px]" />
      </span>
    </motion.button>
  )
}

const KIND_ICON = { cafe: Coffee }

export default function CommandPalette() {
  const app = useApp()
  const { paletteOpen, setPaletteOpen, recents, places, lists, me, mapApi, selectPlace, runAfina, setTheme, dark, setTab, setSnap, locate, fmt, startRoute } = app
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState({ q: '', items: [], loading: false, error: false })
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const restoreFocus = useRef(null)

  // ⌘K / Ctrl+K / "/" to open
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName))) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPaletteOpen])

  useEffect(() => {
    if (paletteOpen) {
      restoreFocus.current = document.activeElement
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    } else restoreFocus.current?.focus?.()
  }, [paletteOpen])

  // Debounced place search
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2 || parseCoords(query)) { setRemote({ q: '', items: [], loading: false, error: false }); return }
    setRemote((r) => ({ ...r, loading: true, error: false }))
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const near = me || mapApi.current?.center()
        const items = await searchPlaces(query, { near, limit: 7, signal: ctrl.signal })
        setRemote({ q: query, items: items.map((p) => ({ ...p, distance: near ? haversine(near, p) : null })), loading: false, error: false })
      } catch (e) {
        if (e.name !== 'AbortError') setRemote({ q: query, items: [], loading: false, error: true })
      }
    }, 320)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, me, mapApi])

  const close = () => setPaletteOpen(false)
  const go = (fn) => () => { close(); fn() }

  const sections = useMemo(() => {
    const query = q.trim()
    const lower = query.toLowerCase()
    const home = places.find((p) => p.listId === 'home')
    const work = places.find((p) => p.listId === 'work')
    const commands = [
      home ? { id: 'c-home', icon: Home, title: 'Route home', subtitle: home.address || 'Home', run: go(() => startRoute({ ...home, id: home.sourceId || home.id })) }
        : { id: 'c-home', icon: Home, title: 'Set your home', subtitle: 'Open a place, then save it to Home', run: go(() => { setTab('saved'); setSnap('half') }) },
      work && { id: 'c-work', icon: Briefcase, title: 'Route to work', subtitle: work.address || 'Work', run: go(() => startRoute({ ...work, id: work.sourceId || work.id })) },
      { id: 'c-cafe', icon: Coffee, title: 'Cafés near me', subtitle: 'Ask Afina', run: go(() => runAfina('Cafés near me', { toast: true })) },
      { id: 'c-locate', icon: LocateFixed, title: 'Show my location', run: go(() => locate()) },
      { id: 'c-saved', icon: Bookmark, title: 'Saved places', run: go(() => { setTab('saved'); setSnap('half') }) },
      { id: 'c-routes', icon: Navigation, title: 'Plan a route', run: go(() => { setTab('routes'); setSnap('half') }) },
      { id: 'c-afina', icon: Sparkles, title: 'Talk to Afina', run: go(() => { setTab('afina'); setSnap('full') }) },
      { id: 'c-theme', icon: dark ? Sun : Moon, title: dark ? 'Switch to light mode' : 'Switch to dark mode', run: go(() => setTheme(dark ? 'light' : 'dark')) },
      { id: 'c-settings', icon: Settings, title: 'Settings', run: go(() => { setTab('settings'); setSnap('half') }) },
    ].filter(Boolean)

    if (!query) {
      return [
        { title: 'Suggestions', items: commands.slice(0, 5) },
        recents.length && { title: 'Recent', items: recents.slice(0, 6).map((p) => ({ id: `r-${p.id}`, icon: Clock, title: p.name, subtitle: p.address, run: go(() => selectPlace(p)) })) },
      ].filter(Boolean)
    }

    const coords = parseCoords(query)
    const savedHits = places.filter((p) => p.name.toLowerCase().includes(lower) || p.address.toLowerCase().includes(lower)).slice(0, 4)
    const cmdHits = commands.filter((c) => c.title.toLowerCase().includes(lower)).slice(0, 3)
    return [
      {
        title: null,
        items: [
          coords && { id: 'coords', icon: MapPin, title: `Go to ${coords.lat}, ${coords.lng}`, subtitle: 'Coordinates', mono: true, run: go(() => selectPlace({ id: query, name: 'Dropped pin', address: 'Coordinates', ...coords, kind: 'pin' })) },
          { id: 'afina', icon: Sparkles, brand: true, title: `Ask Afina: “${query}”`, subtitle: 'Routes, saving, nearby — in plain words', run: go(() => { runAfina(query, { fromPalette: true, toast: true }) }) },
        ].filter(Boolean),
      },
      savedHits.length && { title: 'Saved', items: savedHits.map((p) => ({ id: `s-${p.id}`, emoji: lists.find((l) => l.id === p.listId)?.emoji, title: p.name, subtitle: p.address, run: go(() => selectPlace({ ...p, id: p.sourceId || p.id })) })) },
      cmdHits.length && { title: 'Commands', items: cmdHits },
      { title: 'Places', loading: remote.loading, error: remote.error, empty: !remote.loading && !remote.error && remote.q === query && !remote.items.length,
        items: remote.items.map((p) => ({ id: `p-${p.id}`, icon: KIND_ICON[p.kind] || MapPin, title: p.name, subtitle: p.address, meta: p.distance != null ? fmt(p.distance) : null, run: go(() => selectPlace(p)) })) },
    ].filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, recents, places, lists, remote, dark, fmt])

  const flat = sections.flatMap((s) => s.items)
  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, flat.length - 1))) }, [flat.length])
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % Math.max(1, flat.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + flat.length) % Math.max(1, flat.length)) }
    else if (e.key === 'Enter') { e.preventDefault(); flat[active]?.run() }
  }

  let idx = -1
  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className="absolute inset-0 bg-[rgb(10_10_10/.18)] dark:bg-[rgb(0_0_0/.45)]" onClick={close} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={spring}
            className="glass-strong absolute inset-x-3 top-[calc(var(--safe-top)+12px)] mx-auto flex max-h-[min(640px,calc(100dvh-24px-var(--safe-top)))] max-w-[640px] flex-col overflow-hidden rounded-[28px] md:top-[12vh]"
          >
            <div className="flex items-center gap-3 border-b hairline px-4">
              <Search className="h-5 w-5 shrink-0 text-fg/50" strokeWidth={2.1} aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0) }}
                onKeyDown={onKeyDown}
                placeholder="Search places or type a command…"
                aria-label="Search places or type a command"
                aria-controls="palette-list"
                aria-activedescendant={flat[active] ? `pi-${flat[active].id}` : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                enterKeyHint="go"
                className="h-[60px] min-w-0 flex-1 bg-transparent text-[17px] outline-none focus-visible:outline-none"
              />
              <button type="button" onClick={close} className="tap -mr-2 flex items-center justify-center rounded-full text-fg/55 hover:text-fg" aria-label="Close search">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div ref={listRef} id="palette-list" role="listbox" className="scroll-y px-2 pb-2">
              {sections.map((s, si) => (
                <div key={s.title ?? si} role="group" aria-label={s.title || 'Top'}>
                  {s.title && (
                    <div className="flex items-center gap-2 px-3 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[.06em] text-fg/40">
                      {s.title}
                      {s.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Searching" />}
                    </div>
                  )}
                  {!s.title && <div className="h-2" />}
                  {s.items.map((it) => {
                    idx++
                    const i = idx
                    const Icon = it.icon
                    return (
                      <button
                        key={it.id}
                        id={`pi-${it.id}`}
                        data-idx={i}
                        role="option"
                        aria-selected={i === active}
                        type="button"
                        tabIndex={-1}
                        onMouseMove={() => setActive(i)}
                        onClick={it.run}
                        className={cx('flex min-h-[52px] w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left transition-colors duration-150', i === active ? 'bg-fg/[.07]' : '')}
                      >
                        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[16px]', it.brand ? 'brand-fill' : 'tile')}>
                          {it.emoji || (Icon && <Icon className={cx('h-[18px] w-[18px]', !it.brand && 'text-fg/70')} strokeWidth={2} aria-hidden />)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cx('block truncate text-[15px] font-medium', it.mono && 'font-mono text-[14px]')}>{it.title}</span>
                          {it.subtitle && <span className="block truncate text-[13px] text-fg/50">{it.subtitle}</span>}
                        </span>
                        {it.meta && <span className="shrink-0 text-[13px] tabular-nums text-fg/45">{it.meta}</span>}
                        {i === active && <ArrowUpRight className="h-4 w-4 shrink-0 text-fg/35" aria-hidden />}
                      </button>
                    )
                  })}
                  {s.error && <p className="px-3 py-3 text-[14px] text-fg/55">Search is offline right now. Check your connection and try again.</p>}
                  {s.empty && <p className="px-3 py-3 text-[14px] text-fg/55">No places match “{q.trim()}”. Try a city, street or landmark.</p>}
                </div>
              ))}
            </div>
            <div className="hidden items-center gap-4 border-t hairline px-5 py-2.5 text-[12px] text-fg/40 md:flex">
              <span><kbd className="font-sans">↑↓</kbd> to move</span>
              <span><kbd className="font-sans">↵</kbd> to open</span>
              <span><kbd className="font-sans">esc</kbd> to close</span>
              <span className="ml-auto flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" aria-hidden /> Eternal Maps</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
