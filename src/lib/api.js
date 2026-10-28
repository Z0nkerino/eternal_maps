// Free, key-less OpenStreetMap services: Nominatim (search) and OSRM (routing).
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OSRM = {
  walk: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
  cycle: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
  drive: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
}
const OSRM_FALLBACK_DRIVE = 'https://router.project-osrm.org/route/v1/driving'

const lang = () => (navigator.language || 'en').split(',')[0]

function shortAddress(a = {}, fallback = '') {
  const street = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ')
  const area = a.suburb || a.neighbourhood || a.city_district
  const city = a.city || a.town || a.village || a.hamlet || a.municipality
  const parts = [street, area !== city ? area : null, city, a.country].filter(Boolean)
  return parts.length ? [...new Set(parts)].slice(0, 3).join(', ') : fallback
}

export function toPlace(r) {
  const display = r.display_name || ''
  const name = r.name || r.namedetails?.name || display.split(',')[0] || 'Dropped pin'
  return {
    id: r.osm_type && r.osm_id ? `${r.osm_type[0]}${r.osm_id}` : `${(+r.lat).toFixed(5)},${(+r.lon).toFixed(5)}`,
    name,
    address: shortAddress(r.address, display.split(',').slice(1, 4).join(',').trim()),
    lat: +r.lat,
    lng: +r.lon,
    kind: (r.type && r.type !== 'yes' ? r.type : r.category || '').replace(/_/g, ' '),
    bbox: r.boundingbox ? r.boundingbox.map(Number) : null, // [s, n, w, e]
  }
}

export async function searchPlaces(q, { near, bounded = false, limit = 8, signal } = {}) {
  const p = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: String(limit), 'accept-language': lang() })
  if (near) {
    const d = bounded ? 0.03 : 0.6
    p.set('viewbox', [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(','))
    if (bounded) p.set('bounded', '1')
  }
  const res = await fetch(`${NOMINATIM}/search?${p}`, { signal })
  if (!res.ok) throw new Error('search-failed')
  return (await res.json()).map(toPlace)
}

export async function reverseGeocode({ lat, lng }, { signal } = {}) {
  const p = new URLSearchParams({ lat, lon: lng, format: 'jsonv2', addressdetails: '1', zoom: '18', 'accept-language': lang() })
  const res = await fetch(`${NOMINATIM}/reverse?${p}`, { signal })
  if (!res.ok) throw new Error('reverse-failed')
  const json = await res.json()
  if (json.error) throw new Error('reverse-failed')
  const place = toPlace(json)
  return { ...place, lat, lng }
}

const MANEUVER = {
  depart: 'Head', arrive: 'Arrive', merge: 'Merge', 'on ramp': 'Take the ramp', 'off ramp': 'Take the exit',
  fork: 'Keep', 'end of road': 'Turn', roundabout: 'Enter the roundabout', rotary: 'Enter the roundabout',
  'roundabout turn': 'At the roundabout, turn', 'exit roundabout': 'Exit the roundabout', 'exit rotary': 'Exit the roundabout',
}

function instruction(step) {
  const { type, modifier, exit } = step.maneuver
  const road = step.name || step.ref || ''
  const onto = road ? ` onto ${road}` : ''
  const mod = modifier ? modifier.replace('sharp ', 'sharp ').replace('slight ', 'slightly ') : ''
  switch (type) {
    case 'depart': return `Head ${headingWord(step.maneuver.bearing_after)}${road ? ` on ${road}` : ''}`
    case 'arrive': return mod && mod !== 'straight' ? `Arrive — destination on the ${modifier.includes('left') ? 'left' : 'right'}` : 'Arrive at your destination'
    case 'roundabout': case 'rotary': return `At the roundabout, take exit ${exit || 1}${onto}`
    case 'continue': case 'new name': return mod === 'straight' || !mod ? `Continue${onto}` : `Continue ${mod}${onto}`
    case 'turn': case 'end of road': return mod === 'straight' ? `Go straight${onto}` : mod === 'uturn' ? `Make a U-turn${onto}` : `Turn ${mod}${onto}`
    case 'fork': return `Keep ${mod.includes('left') ? 'left' : mod.includes('right') ? 'right' : 'straight'}${onto}`
    default: return `${MANEUVER[type] || 'Continue'}${mod && type !== 'merge' ? ` ${mod}` : ''}${onto}`
  }
}

function headingWord(b = 0) {
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(b / 45) % 8]
}

export async function getRoute(from, to, mode = 'walk', { signal } = {}) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const qs = 'overview=full&geometries=geojson&steps=true&alternatives=false'
  const bases = mode === 'drive' ? [OSRM.drive, OSRM_FALLBACK_DRIVE] : [OSRM[mode]]
  let lastErr
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/${coords}?${qs}`, { signal })
      if (!res.ok) throw new Error('route-failed')
      const json = await res.json()
      if (json.code !== 'Ok' || !json.routes?.length) throw new Error(json.code === 'NoRoute' ? 'no-route' : 'route-failed')
      const r = json.routes[0]
      return {
        mode,
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry,
        steps: r.legs.flatMap((l) => l.steps).map((s) => ({
          text: instruction(s),
          distance: s.distance,
          type: s.maneuver.type,
          modifier: s.maneuver.modifier || '',
          location: { lng: s.maneuver.location[0], lat: s.maneuver.location[1] },
        })),
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastErr = e
    }
  }
  throw lastErr
}
