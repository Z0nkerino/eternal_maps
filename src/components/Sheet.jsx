import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { Bookmark, Compass, Navigation, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useApp } from '../store'
import { springSheet, springToggle } from '../lib/motion'
import { cx } from './ui'
import Explore from '../tabs/Explore'
import Saved from '../tabs/Saved'
import Routes from '../tabs/Routes'
import Afina from '../tabs/Afina'
import Settings from '../tabs/Settings'

export const TABS = [
  { id: 'explore', label: 'Explore', icon: Compass, Comp: Explore },
  { id: 'saved', label: 'Saved', icon: Bookmark, Comp: Saved },
  { id: 'routes', label: 'Routes', icon: Navigation, Comp: Routes },
  { id: 'afina', label: 'Afina', icon: Sparkles, Comp: Afina },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, Comp: Settings },
]

export const PEEK = 92 // handle + tab bar

function TabBar({ onSelect }) {
  const { tab } = useApp()
  return (
    <div role="tablist" aria-label="Sections" className="flex gap-1 px-2">
      {TABS.map((t) => {
        const active = tab === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active}
            aria-controls="sheet-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              const i = TABS.findIndex((x) => x.id === tab)
              const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
              if (d) { e.preventDefault(); const n = TABS[(i + d + TABS.length) % TABS.length]; onSelect(n.id); document.getElementById(`tab-${n.id}`)?.focus() }
            }}
            className={cx('relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[11px] font-medium transition-colors duration-200', active ? 'text-white' : 'text-fg/55 hover:text-fg')}
          >
            {active && <motion.span layoutId="tab-pill" transition={springToggle} className="brand-fill absolute inset-0 rounded-[16px] shadow-[0_6px_18px_-8px_rgb(47_107_255/.7)]" />}
            <Icon className="relative h-[19px] w-[19px]" strokeWidth={2.1} aria-hidden />
            <span className="relative">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function Panel() {
  const { tab } = useApp()
  const T = TABS.find((t) => t.id === tab)
  return (
    <motion.div key={tab} id="sheet-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} className="flex min-h-0 flex-1 flex-col">
      <T.Comp />
    </motion.div>
  )
}

// Desktop: a floating glass sidebar on the left.
export function Sidebar({ header }) {
  const { setTab } = useApp()
  return (
    <aside aria-label="Eternal Maps" className="glass-strong pointer-events-auto absolute bottom-4 left-4 top-4 z-20 flex w-[380px] flex-col overflow-hidden rounded-[28px]">
      <div className="em-sidebar-head p-3 pb-2">{header}</div>
      <div className="pb-2"><TabBar onSelect={setTab} /></div>
      <div className="mx-4 h-px bg-fg/[.07]" />
      <Panel />
    </aside>
  )
}

// Phone: a draggable glass sheet — peek / half / full.
export function BottomSheet() {
  const { snap, setSnap, setTab, tab, selected } = useApp()
  const [vh, setVh] = useState(() => window.innerHeight)
  useEffect(() => {
    const on = () => setVh(window.visualViewport?.height || window.innerHeight)
    on()
    window.addEventListener('resize', on)
    window.visualViewport?.addEventListener('resize', on)
    return () => { window.removeEventListener('resize', on); window.visualViewport?.removeEventListener('resize', on) }
  }, [])

  const heights = { peek: PEEK, half: Math.round(vh * 0.5), full: vh - 84 }
  const h = useMotionValue(heights[snap])
  const start = useRef(0)

  useEffect(() => {
    const c = animate(h, heights[snap], matchMedia('(prefers-reduced-motion: reduce)').matches ? { duration: 0 } : springSheet)
    return c.stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, vh])

  // A place card takes the stage — the sheet steps back to peek.
  useEffect(() => { if (selected && snap !== 'peek') setSnap('peek') }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPanStart = () => { start.current = h.get() }
  const onPan = (_, info) => h.set(Math.max(PEEK - 20, Math.min(heights.full + 10, start.current - info.offset.y)))
  const onPanEnd = (_, info) => {
    const cur = h.get()
    const v = -info.velocity.y
    const order = ['peek', 'half', 'full']
    let target
    if (Math.abs(v) > 500) {
      // A flick moves to the next snap point in its direction.
      const nextUp = order.find((s) => heights[s] > cur + 4)
      const nextDown = [...order].reverse().find((s) => heights[s] < cur - 4)
      target = v > 0 ? nextUp || 'full' : nextDown || 'peek'
    } else target = order.reduce((a, b) => (Math.abs(heights[b] - cur) < Math.abs(heights[a] - cur) ? b : a))
    if (target === snap) animate(h, heights[target], springSheet)
    else setSnap(target)
  }

  const cycle = () => setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')

  return (
    <motion.section
      aria-label="Eternal Maps panel"
      style={{ height: h }}
      className="glass-strong pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[28px] pb-[var(--safe-bottom)]"
    >
      <motion.div onPanStart={onPanStart} onPan={onPan} onPanEnd={onPanEnd} className="shrink-0 touch-none select-none">
        <button type="button" onClick={cycle} aria-label={`Panel ${snap}. Tap to ${snap === 'full' ? 'collapse' : 'expand'}.`} className="flex h-6 w-full items-center justify-center">
          <span className="h-[5px] w-10 rounded-full bg-fg/20" aria-hidden />
        </button>
        <TabBar onSelect={(id) => { if (id === tab && snap !== 'peek') setSnap('peek'); else { setTab(id); if (snap === 'peek') setSnap('half') } }} />
      </motion.div>
      <div className="mx-4 mt-2 h-px shrink-0 bg-fg/[.07]" />
      <div className={cx('flex min-h-0 flex-1 flex-col', snap === 'peek' && 'invisible')} aria-hidden={snap === 'peek'}>
        <Panel />
      </div>
    </motion.section>
  )
}
