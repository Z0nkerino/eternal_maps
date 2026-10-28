import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useApp } from '../store'
import { buildStyle } from '../lib/mapStyle'
import { useIsDesktop } from '../lib/useMedia'

// MapLibre 6 loads its worker next to the bundle; point it at the file Vite emits.
maplibregl.setWorkerUrl(workerUrl)

const START = { center: [2.3488, 48.8534], zoom: 12 } // a calm default until we know where you are
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function pinEl({ small = false, label } = {}) {
  const el = document.createElement('div')
  el.className = small ? 'em-pin em-pin--small' : 'em-pin'
  el.setAttribute('role', 'img')
  if (label) el.setAttribute('aria-label', label)
  el.innerHTML = small
    ? `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9" fill="rgb(var(--bg))" stroke="rgb(var(--fg))" stroke-opacity=".9" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="rgb(var(--fg))"/></svg>`
    : `<svg viewBox="0 0 34 44" width="34" height="44"><defs><linearGradient id="emPinG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f6bff"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs><path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8c0 10.4 12.2 22.6 14.2 24.5a1.9 1.9 0 0 0 2.6 0c2-1.9 14.2-14.1 14.2-24.5C32.5 8.3 25.6 1.5 17 1.5Z" fill="url(#emPinG)" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16.5" r="5.2" fill="#fff"/></svg>`
  return el
}

function savedEl(emoji, name) {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', name)
  el.title = name
  el.className = 'glass-strong flex h-8 w-8 items-center justify-center rounded-full text-[15px] leading-none transition-transform duration-200 hover:scale-110'
  el.textContent = emoji
  return el
}

function meEl() {
  const el = document.createElement('div')
  el.className = 'em-me'
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', 'Your location')
  el.innerHTML = '<div class="em-me__halo"></div><div class="em-me__cone" hidden></div><div class="em-me__dot"></div>'
  return el
}

export default function MapView({ onBearing }) {
  const app = useApp()
  const { dark, settings, selected, results, route, me, places, lists, mapApi, selectPlace, dropPin, setSelected, snap } = app
  const container = useRef(null)
  const map = useRef(null)
  const [styleVersion, setStyleVersion] = useState(0)
  const [failed, setFailed] = useState(false)
  const isDesktop = useIsDesktop()
  const layoutRef = useRef({ isDesktop, snap })
  layoutRef.current = { isDesktop, snap }
  const handlers = useRef({})
  handlers.current = { selectPlace, dropPin, setSelected, selected, results }

  // Keep things in view around floating glass: the sidebar on desktop, the sheet on phones.
  const padding = () => {
    const { isDesktop: d, snap: s } = layoutRef.current
    if (d) return { top: 40, bottom: 40, left: 440, right: 90 }
    const h = window.innerHeight
    const bottom = s === 'half' ? h * 0.5 : s === 'full' ? h * 0.5 : 260
    return { top: 110, bottom: Math.min(bottom + 20, h - 200), left: 40, right: 70 }
  }

  // ── Create map once ────────────────────────────────────────
  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current,
      style: buildStyle({ dark, detailed: settings.detailed, buildings3d: settings.buildings3d }),
      ...START,
      attributionControl: { compact: true },
      pitchWithRotate: true,
      dragRotate: true,
      maxPitch: 60,
      fadeDuration: 150,
    })
    map.current = m
    m.keyboard.enable()
    m.getCanvas().setAttribute('aria-label', 'Map. Use arrow keys to pan, plus and minus to zoom.')
    m.on('style.load', () => setStyleVersion((v) => v + 1))
    m.on('rotate', () => onBearing?.(m.getBearing()))
    let tileErrors = 0
    m.on('error', (e) => { if (e?.sourceId === 'omt' || /tiles|style|glyph/i.test(e?.error?.message || '')) { tileErrors++; if (tileErrors > 3 && !m.loaded()) setFailed(true) } })
    m.on('data', (e) => { if (e.sourceId === 'omt' && e.isSourceLoaded) setFailed(false) })

    // Tap empty map: dismiss. Tap a POI label: open it. Right-click / long-press: drop a pin.
    m.on('click', (e) => {
      const feats = m.queryRenderedFeatures(e.point, { layers: ['poi', 'place-city', 'place-minor'].filter((l) => m.getLayer(l)) })
      const f = feats[0]
      if (f && f.properties?.name) {
        const [lng, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat]
        handlers.current.selectPlace({ id: `poi:${f.id ?? f.properties.name}`, name: f.properties.name, address: (f.properties.class || '').replace(/_/g, ' '), lat, lng, kind: f.properties.class || '' }, { fly: false })
        return
      }
      if (handlers.current.selected) handlers.current.setSelected(null)
    })
    m.on('contextmenu', (e) => handlers.current.dropPin(e.lngLat))
    let pressTimer
    let pressPoint
    m.on('touchstart', (e) => {
      if (e.originalEvent.touches.length !== 1) return
      pressPoint = e.point
      pressTimer = setTimeout(() => { navigator.vibrate?.(8); handlers.current.dropPin(e.lngLat) }, 550)
    })
    m.on('touchmove', (e) => { if (pressPoint && e.point.dist(pressPoint) > 8) clearTimeout(pressTimer) })
    m.on('touchend', () => clearTimeout(pressTimer))
    m.on('movestart', (e) => { if (e.originalEvent) clearTimeout(pressTimer) })

    const dur = () => (reduceMotion() ? 0 : 900)
    // flyTo/easeTo keep their padding on the map; fitBounds adds its own on top. Only pass the difference.
    const fitPadding = () => {
      const want = padding()
      const have = m.getPadding()
      const out = {}
      for (const k of ['top', 'bottom', 'left', 'right']) out[k] = Math.max(0, want[k] - (have[k] || 0)) + 24
      return out
    }
    mapApi.current = {
      flyTo: (p, zoom, opts = {}) => m.flyTo({ center: [p.lng, p.lat], zoom: zoom ?? m.getZoom(), padding: padding(), duration: dur(), essential: true, ...opts.extra }),
      fitBounds: ([s, n, w, e]) => m.fitBounds([[w, s], [e, n]], { padding: fitPadding(), duration: dur(), maxZoom: 16 }),
      fitPoints: (pts) => {
        if (!pts.length) return
        if (pts.length === 1) return m.flyTo({ center: [pts[0].lng, pts[0].lat], zoom: 15, padding: padding(), duration: dur() })
        const b = new maplibregl.LngLatBounds()
        pts.forEach((p) => b.extend([p.lng, p.lat]))
        m.fitBounds(b, { padding: fitPadding(), duration: dur(), maxZoom: 16 })
      },
      fitRoute: (coords) => {
        const b = new maplibregl.LngLatBounds()
        coords.forEach((c) => b.extend(c))
        m.fitBounds(b, { padding: fitPadding(), duration: dur(), maxZoom: 17 })
      },
      zoomBy: (d) => m.easeTo({ zoom: m.getZoom() + d, duration: reduceMotion() ? 0 : 300 }),
      resetNorth: () => m.easeTo({ bearing: 0, pitch: 0, duration: reduceMotion() ? 0 : 500 }),
      zoom: () => m.getZoom(),
      center: () => { const c = m.getCenter(); return { lat: c.lat, lng: c.lng } },
      jumpTo: (p, zoom) => m.jumpTo({ center: [p.lng, p.lat], zoom }),
      map: m,
    }
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(container.current)
    return () => { ro.disconnect(); m.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Style: theme, detail, 3D ───────────────────────────────
  const styleKey = useRef(`${dark}${settings.detailed}${settings.buildings3d}`)
  useEffect(() => {
    const key = `${dark}${settings.detailed}${settings.buildings3d}`
    if (key === styleKey.current) return
    styleKey.current = key
    map.current?.setStyle(buildStyle({ dark, detailed: settings.detailed, buildings3d: settings.buildings3d }))
    if (settings.buildings3d && map.current && map.current.getPitch() < 30) map.current.easeTo({ pitch: 50, duration: reduceMotion() ? 0 : 600 })
    if (!settings.buildings3d && map.current?.getPitch() > 0) map.current.easeTo({ pitch: 0, duration: reduceMotion() ? 0 : 600 })
  }, [dark, settings.detailed, settings.buildings3d])

  // ── Route line (gradient) ──────────────────────────────────
  useEffect(() => {
    const m = map.current
    if (!m || styleVersion === 0) return
    try {
      const data = route?.geometry ? { type: 'Feature', geometry: route.geometry, properties: {} } : { type: 'FeatureCollection', features: [] }
      const src = m.getSource('route')
      if (src) { src.setData(data); return }
      m.addSource('route', { type: 'geojson', data, lineMetrics: true })
      const before = m.getLayer('water-name') ? 'water-name' : undefined
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': dark ? '#0A0A0A' : '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 18, 16], 'line-opacity': 0.95 } }, before)
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 18, 10],
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#2f6bff', 1, '#ff4fa3'],
        } }, before)
    } catch {
      // A new style is still loading — its style.load bumps styleVersion and re-runs this.
    }
  }, [route, styleVersion, dark])

  // ── Markers ────────────────────────────────────────────────
  const markers = useRef({ selected: null, me: null, results: [], saved: [], routeEnds: [] })

  useEffect(() => {
    const m = map.current
    markers.current.selected?.remove()
    markers.current.selected = null
    if (m && selected && selected.id !== 'me') {
      markers.current.selected = new maplibregl.Marker({ element: pinEl({ label: selected.name }), anchor: 'bottom' }).setLngLat([selected.lng, selected.lat]).addTo(m)
    }
  }, [selected])

  useEffect(() => {
    const m = map.current
    markers.current.results.forEach((mk) => mk.remove())
    markers.current.results = (results?.items || []).map((p) => {
      const el = pinEl({ small: true, label: p.name })
      el.style.cursor = 'pointer'
      el.addEventListener('click', (e) => { e.stopPropagation(); handlers.current.selectPlace(p, { keepResults: true }) })
      return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m)
    })
  }, [results])

  useEffect(() => {
    const m = map.current
    markers.current.saved.forEach((mk) => mk.remove())
    markers.current.saved = places.map((p) => {
      const list = lists.find((l) => l.id === p.listId)
      const el = savedEl(list?.emoji || '📍', p.name)
      el.addEventListener('click', (e) => { e.stopPropagation(); handlers.current.selectPlace({ ...p, id: p.sourceId || p.id }) })
      return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m)
    })
  }, [places, lists])

  useEffect(() => {
    const m = map.current
    markers.current.routeEnds.forEach((mk) => mk.remove())
    markers.current.routeEnds = []
    if (route?.geometry && route.to) {
      markers.current.routeEnds.push(new maplibregl.Marker({ element: pinEl({ label: route.to.name }), anchor: 'bottom' }).setLngLat([route.to.lng, route.to.lat]).addTo(m))
      if (route.from && route.from.id !== 'me') markers.current.routeEnds.push(new maplibregl.Marker({ element: pinEl({ small: true, label: route.from.name }) }).setLngLat([route.from.lng, route.from.lat]).addTo(m))
    }
  }, [route])

  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!me) { markers.current.me?.remove(); markers.current.me = null; return }
    if (!markers.current.me) markers.current.me = new maplibregl.Marker({ element: meEl(), rotationAlignment: 'map' }).setLngLat([me.lng, me.lat]).addTo(m)
    else markers.current.me.setLngLat([me.lng, me.lat])
    const cone = markers.current.me.getElement().querySelector('.em-me__cone')
    if (me.heading != null && !isNaN(me.heading)) { cone.hidden = false; cone.style.transform = `rotate(${me.heading}deg)` } else cone.hidden = true
  }, [me])

  return (
    <div className="absolute inset-0">
      <div ref={container} className="absolute inset-0" />
      {failed && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-6">
          <div className="glass-strong rounded-[20px] px-5 py-4 text-center">
            <p className="text-[15px] font-semibold">The map is taking a moment</p>
            <p className="mt-0.5 text-[13px] text-fg/55">We couldn’t load map tiles. Check your connection — your places are safe.</p>
          </div>
        </div>
      )}
    </div>
  )
}
