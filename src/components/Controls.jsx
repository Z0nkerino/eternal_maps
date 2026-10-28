import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers, Loader2, LocateFixed, Minus, Monitor, Moon, Navigation2, Plus, Sun } from 'lucide-react'
import { useApp } from '../store'
import { spring } from '../lib/motion'
import { Glass, IconButton, Segmented, Toggle, cx } from './ui'

const THEME_NEXT = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }
const THEME_LABEL = { system: 'Theme: System', light: 'Theme: Light', dark: 'Theme: Dark' }

export default function Controls({ bearing, className }) {
  const { locate, locStatus, mapApi, theme, setTheme, settings, setSettings } = useApp()
  const [layersOpen, setLayersOpen] = useState(false)
  const popRef = useRef(null)
  const ThemeIcon = THEME_ICON[theme]

  useEffect(() => {
    if (!layersOpen) return
    const onDown = (e) => { if (!popRef.current?.contains(e.target)) setLayersOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setLayersOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [layersOpen])

  return (
    <div ref={popRef} className={cx('pointer-events-auto flex flex-col items-end gap-2', className)}>
      <Glass strong className="flex flex-col rounded-[18px] p-0.5">
        <IconButton label={locStatus === 'locating' ? 'Finding you…' : 'Show my location'} onClick={() => locate()}>
          {locStatus === 'locating' ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <LocateFixed className={cx('h-5 w-5', locStatus === 'ok' && 'text-[var(--blue)]')} strokeWidth={2.1} />
          )}
        </IconButton>
        <div className="mx-2.5 h-px bg-fg/[.08]" />
        <IconButton label="Point north" onClick={() => mapApi.current?.resetNorth()}>
          <motion.span animate={{ rotate: -bearing }} transition={{ type: 'tween', duration: 0 }} className="relative flex h-5 w-5 items-center justify-center">
            <Navigation2 className="h-5 w-5" strokeWidth={2.1} />
          </motion.span>
        </IconButton>
      </Glass>
      <Glass strong className="flex flex-col rounded-[18px] p-0.5">
        <IconButton label="Zoom in" onClick={() => mapApi.current?.zoomBy(1)}><Plus className="h-5 w-5" strokeWidth={2.1} /></IconButton>
        <div className="mx-2.5 h-px bg-fg/[.08]" />
        <IconButton label="Zoom out" onClick={() => mapApi.current?.zoomBy(-1)}><Minus className="h-5 w-5" strokeWidth={2.1} /></IconButton>
      </Glass>
      <Glass strong className="flex flex-col rounded-[18px] p-0.5">
        <IconButton label="Map layers" aria-expanded={layersOpen} aria-haspopup="dialog" onClick={() => setLayersOpen((v) => !v)}><Layers className="h-5 w-5" strokeWidth={2.1} /></IconButton>
        <div className="mx-2.5 h-px bg-fg/[.08]" />
        <IconButton label={`${THEME_LABEL[theme]}. Switch to ${THEME_NEXT[theme]}.`} onClick={() => setTheme(THEME_NEXT[theme])}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={theme} initial={{ opacity: 0, rotate: -40, scale: 0.7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 40, scale: 0.7 }} transition={spring} className="flex">
              <ThemeIcon className="h-5 w-5" strokeWidth={2.1} />
            </motion.span>
          </AnimatePresence>
        </IconButton>
      </Glass>
      <AnimatePresence>
        {layersOpen && (
          <motion.div role="dialog" aria-label="Map layers" initial={{ opacity: 0, x: 8, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 8, scale: 0.97 }} transition={spring}
            className="glass-strong absolute right-[calc(100%+10px)] top-[112px] w-[260px] rounded-[22px] p-3">
            <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[.06em] text-fg/45">Map</p>
            <Segmented label="Map detail" value={settings.detailed ? 'detailed' : 'minimal'} onChange={(v) => setSettings((s) => ({ ...s, detailed: v === 'detailed' }))}
              options={[{ value: 'minimal', label: 'Minimal' }, { value: 'detailed', label: 'Detailed' }]} />
            <div className="mt-2">
              <Toggle label="3D buildings" description="Tilts the map in cities" checked={settings.buildings3d} onChange={(v) => setSettings((s) => ({ ...s, buildings3d: v }))} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
