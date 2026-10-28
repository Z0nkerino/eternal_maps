export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function haversine(a, b) {
  if (!a || !b) return null
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(m, units = 'km') {
  if (m == null || isNaN(m)) return ''
  if (units === 'mi') {
    const ft = m * 3.28084
    if (ft < 1000) return `${Math.round(ft / 10) * 10} ft`
    const mi = m / 1609.344
    return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`
  }
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`
  const km = m / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

export function formatDuration(s) {
  if (s == null) return ''
  const min = Math.max(1, Math.round(s / 60))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function arrivalTime(s) {
  const d = new Date(Date.now() + s * 1000)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export const formatCoords = (p) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`

export function parseCoords(text) {
  const m = String(text).trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!m) return null
  const lat = +m[1], lng = +m[2]
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}
