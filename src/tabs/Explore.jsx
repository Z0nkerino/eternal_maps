import { Clock, Coffee, Utensils, Trees, Fuel, Pill, ShoppingBasket, Home, Briefcase, MapPin, X, Search } from 'lucide-react'
import { useApp } from '../store'
import { haversine } from '../lib/geo'
import { Empty, Row, SectionTitle, cx } from '../components/ui'

const NEARBY = [
  { q: 'Cafés', icon: Coffee },
  { q: 'Restaurants', icon: Utensils },
  { q: 'Parks', icon: Trees },
  { q: 'Groceries', icon: ShoppingBasket },
  { q: 'Pharmacies', icon: Pill },
  { q: 'Gas stations', icon: Fuel },
]

export default function Explore() {
  const { results, setResults, selectPlace, recents, setRecents, places, me, fmt, runAfina, afinaBusy, startRoute, setTab, setPaletteOpen } = useApp()
  const home = places.find((p) => p.listId === 'home')
  const work = places.find((p) => p.listId === 'work')
  const go = (p) => ({ ...p, id: p.sourceId || p.id })

  if (results) {
    return (
      <div className="scroll-y flex-1 px-3 pb-6 pt-3">
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <h2 className="truncate text-[17px] font-semibold">{results.title}</h2>
          <button type="button" onClick={() => setResults(null)} className="tap -mr-1 flex items-center justify-center rounded-full text-fg/50 hover:text-fg" aria-label="Clear results">
            <span className="tile flex h-8 w-8 items-center justify-center rounded-full"><X className="h-4 w-4" /></span>
          </button>
        </div>
        {results.items.length === 0 ? (
          <Empty icon={Search} title="Nothing nearby">Try a broader word, or move the map and search again.</Empty>
        ) : (
          <ul>
            {results.items.map((p, i) => (
              <li key={p.id}>
                <Row
                  onClick={() => selectPlace(p, { keepResults: true })}
                  leading={<span className="text-[14px] font-semibold tabular-nums text-fg/70">{i + 1}</span>}
                  title={p.name}
                  subtitle={[p.kind, p.address].filter(Boolean).join(' · ')}
                  trailing={p.distance != null && <span className="shrink-0 text-[13px] tabular-nums text-fg/50">{fmt(p.distance)}</span>}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="scroll-y flex-1 px-3 pb-6 pt-1">
      <SectionTitle>Favorites</SectionTitle>
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {[
          { key: 'home', label: 'Home', icon: Home, p: home },
          { key: 'work', label: 'Work', icon: Briefcase, p: work },
        ].map(({ key, label, icon: Icon, p }) => (
          <button key={key} type="button" onClick={() => (p ? startRoute(go(p)) : (setTab('saved')))}
            className="tile tap flex min-w-[132px] flex-1 items-center gap-3 rounded-[20px] p-3 text-left transition-colors hover:bg-fg/[.07]">
            <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', p ? 'brand-fill' : 'bg-fg/[.08] text-fg/60')}><Icon className="h-[18px] w-[18px]" strokeWidth={2.1} /></span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{label}</span>
              <span className="block truncate text-[12px] text-fg/50">{p ? (me ? fmt(haversine(me, p)) : 'Tap to route') : 'Add'}</span>
            </span>
          </button>
        ))}
        {places.filter((p) => p.listId === 'favorites').slice(0, 6).map((p) => (
          <button key={p.id} type="button" onClick={() => selectPlace(go(p))} className="tile tap flex min-w-[132px] items-center gap-3 rounded-[20px] p-3 text-left transition-colors hover:bg-fg/[.07]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg/[.08] text-[17px]">❤️</span>
            <span className="min-w-0">
              <span className="block max-w-[110px] truncate text-[15px] font-semibold">{p.name}</span>
              <span className="block truncate text-[12px] text-fg/50">{me ? fmt(haversine(me, p)) : 'Saved'}</span>
            </span>
          </button>
        ))}
      </div>

      <SectionTitle>Find nearby</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {NEARBY.map(({ q, icon: Icon }) => (
          <button key={q} type="button" disabled={afinaBusy} onClick={() => runAfina(`${q} near me`, { toast: true })}
            className="tile tap flex flex-col items-center justify-center gap-1.5 rounded-[20px] px-2 py-3 text-[13px] font-medium transition-colors hover:bg-fg/[.07] disabled:opacity-50">
            <Icon className="h-5 w-5 text-fg/70" strokeWidth={2} aria-hidden />
            {q}
          </button>
        ))}
      </div>

      <SectionTitle action={recents.length > 0 && <button type="button" onClick={() => setRecents([])} className="rounded-full px-2 py-1 text-[13px] font-medium text-fg/50 hover:text-fg">Clear</button>}>Recent</SectionTitle>
      {recents.length === 0 ? (
        <Empty icon={MapPin} title="No recent places" action={<button type="button" onClick={() => setPaletteOpen(true)} className="text-[14px] font-medium brand-text">Search for a place</button>}>
          Places you open will show up here. Long-press or right-click the map to drop a pin.
        </Empty>
      ) : (
        <ul>
          {recents.slice(0, 8).map((p) => (
            <li key={p.id}>
              <Row onClick={() => selectPlace(p)} leading={<Clock className="h-[18px] w-[18px] text-fg/55" />} title={p.name} subtitle={p.address}
                trailing={me && <span className="shrink-0 text-[13px] tabular-nums text-fg/45">{fmt(haversine(me, p))}</span>} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
