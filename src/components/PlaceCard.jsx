import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, Check, Copy, Footprints, Car, Bike, Share, X } from 'lucide-react'
import { useApp } from '../store'
import { mobileApp, WEB_URL } from '../lib/desktop'
import { formatCoords, haversine } from '../lib/geo'
import { spring, springSheet } from '../lib/motion'
import { Button, cx } from './ui'

export const MODE_ICON = { walk: Footprints, drive: Car, cycle: Bike }

export function shareUrl(p) {
  // Inside the Mac/Windows/phone apps, links point at the hosted web app so they open anywhere.
  const u = new URL(/^https?:$/.test(location.protocol) && !mobileApp ? location.origin + location.pathname : WEB_URL)
  u.searchParams.set('lat', p.lat.toFixed(6))
  u.searchParams.set('lng', p.lng.toFixed(6))
  if (p.name && p.name !== 'Dropped pin') u.searchParams.set('name', p.name)
  return u.toString()
}

export default function PlaceCard({ desktop }) {
  const { selected, setSelected, me, fmt, settings, startRoute, savedFor, lists, savePlace, removePlace, notify, results } = useApp()
  const [picking, setPicking] = useState(false)
  useEffect(() => setPicking(false), [selected?.id])

  useEffect(() => {
    if (!selected) return
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, setSelected])

  const p = selected
  const saved = p ? savedFor(p) : []
  const dist = p && me ? haversine(me, p) : null
  const ModeIcon = MODE_ICON[settings.mode]

  const share = async () => {
    const text = `${p.name}${p.address ? ` — ${p.address}` : ''}\n${formatCoords(p)}`
    const url = shareUrl(p)
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: p.name, text, url }); return }
      await navigator.clipboard.writeText(`${formatCoords(p)}\n${url}`)
      notify('Coordinates and link copied')
    } catch (e) {
      if (e?.name !== 'AbortError') notify('Couldn’t copy. Select the coordinates to copy them by hand.')
    }
  }

  const toggleList = (listId) => {
    const existing = saved.find((s) => s.listId === listId)
    if (existing) { removePlace(existing.id); notify(`Removed from ${lists.find((l) => l.id === listId)?.name}`) }
    else savePlace(p, { listId })
  }

  return (
    <AnimatePresence>
      {p && (
        <motion.section
          key="place"
          aria-label={`${p.name} details`}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={springSheet}
          className={cx(
            'glass-strong pointer-events-auto z-30 rounded-[24px] p-4',
            desktop ? 'absolute bottom-4 left-[412px] w-[380px]' : 'absolute inset-x-3 bottom-[calc(var(--peek)+12px)]',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {p.kind && p.kind !== 'pin' && <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-[.06em] text-fg/45">{p.kind}</p>}
              <h2 className="truncate text-[20px] font-semibold leading-tight tracking-[-.01em]">{p.name}</h2>
              <p className="mt-0.5 line-clamp-2 text-[14px] text-fg/60">
                {[dist != null ? fmt(dist) : null, p.address].filter(Boolean).join(' · ') || 'No address here'}
              </p>
              <p className="mt-1 select-all font-mono text-[12px] text-fg/45" aria-label="Coordinates">{formatCoords(p)}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="tap -mr-2 -mt-2 flex items-center justify-center rounded-full text-fg/50 hover:text-fg" aria-label="Close place">
              <span className="tile flex h-8 w-8 items-center justify-center rounded-full"><X className="h-4 w-4" strokeWidth={2.2} /></span>
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="primary" className="flex-1" icon={ModeIcon} onClick={() => startRoute(p)}>Route</Button>
            <Button variant="secondary" icon={saved.length ? BookmarkCheck : Bookmark} onClick={() => setPicking((v) => !v)} aria-expanded={picking} aria-label={saved.length ? 'Saved — change lists' : 'Save place'}>
              {saved.length ? 'Saved' : 'Save'}
            </Button>
            <Button variant="secondary" className="w-12 shrink-0 !px-0" onClick={share} aria-label="Share coordinates">
              {navigator.share ? <Share className="h-[18px] w-[18px] shrink-0" /> : <Copy className="h-[18px] w-[18px] shrink-0" />}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {picking && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                <div role="group" aria-label="Save to list" className="mt-3 grid grid-cols-2 gap-2">
                  {lists.map((l) => {
                    const on = saved.some((s) => s.listId === l.id)
                    return (
                      <button key={l.id} type="button" aria-pressed={on} onClick={() => toggleList(l.id)}
                        className={cx('tap flex items-center gap-2 rounded-[14px] px-3 text-left text-[14px] font-medium transition-colors', on ? 'bg-fg text-bg' : 'tile hover:bg-fg/[.07]')}>
                        <span className="text-[16px]" aria-hidden>{l.emoji}</span>
                        <span className="min-w-0 flex-1 truncate">{l.name}</span>
                        {on && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {results && !desktop && (
            <button type="button" onClick={() => setSelected(null)} className="mt-2 w-full rounded-[14px] py-2 text-center text-[13px] font-medium text-fg/55 hover:text-fg">
              Back to {results.items.length} results
            </button>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
