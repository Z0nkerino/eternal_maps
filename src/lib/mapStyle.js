// Minimal monochrome map style on OpenFreeMap vector tiles (OpenMapTiles schema).
// Light grey by day, near-black (#0A0A0A) by night — so glass and the gradient route stand out.
const PALETTE = {
  light: {
    bg: '#F1F1F0', land: '#ECECEB', park: '#E3E5E3', wood: '#DFE2DF', water: '#D5D8DD', waterLine: '#C9CDD3',
    building: '#E2E2E1', buildingLine: '#D6D6D5', building3d: '#E6E6E5',
    road: '#FFFFFF', roadMajor: '#FFFFFF', casing: '#DADAD9', casingMajor: '#CFCFCE', path: '#D2D2D1', rail: '#CFCFCE',
    boundary: '#BDBDBC', label: '#5E5E5E', labelSoft: '#8A8A8A', labelStrong: '#2A2A2A', halo: '#F1F1F0', waterLabel: '#8C939C',
  },
  dark: {
    bg: '#0A0A0A', land: '#0D0D0D', park: '#101211', wood: '#111311', water: '#15171B', waterLine: '#1C1F24',
    building: '#141414', buildingLine: '#1B1B1B', building3d: '#1A1A1A',
    road: '#1D1D1D', roadMajor: '#262626', casing: '#0A0A0A', casingMajor: '#0A0A0A', path: '#232323', rail: '#222222',
    boundary: '#3A3A3A', label: '#8E8E8E', labelSoft: '#666666', labelStrong: '#D6D6D6', halo: '#0A0A0A', waterLabel: '#59606B',
  },
}

const NAME = ['coalesce', ['get', 'name'], ['get', 'name_en'], ['get', 'name:latin']]
const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']
const FONT_ITALIC = ['Noto Sans Italic']

const z = (pairs) => ['interpolate', ['exponential', 1.5], ['zoom'], ...pairs]

export function buildStyle({ dark = false, detailed = false, buildings3d = false } = {}) {
  const c = PALETTE[dark ? 'dark' : 'light']
  const roadClass = (classes) => ['match', ['get', 'class'], classes, true, false]
  const major = ['motorway', 'trunk', 'primary']
  const mid = ['secondary', 'tertiary']
  const minor = ['minor', 'service', 'residential', 'unclassified', 'living_street']

  const layers = [
    { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
    { id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': c.land, 'fill-opacity': 0.7 } },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.park } },
    { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland', 'wetland']]], paint: { 'fill-color': ['match', ['get', 'class'], 'wood', c.wood, c.park], 'fill-opacity': 0.8 } },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
    { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': c.waterLine, 'line-width': z([8, 0.5, 18, 6]) } },
    { id: 'aeroway', type: 'fill', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': c.land } },
    {
      id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13,
      paint: { 'fill-color': c.building, 'fill-outline-color': c.buildingLine, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, 1] },
    },
    // Casings
    { id: 'road-casing-mid', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10, filter: roadClass(mid), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.casing, 'line-width': z([10, 1.5, 18, 26]) } },
    { id: 'road-casing-major', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: roadClass(major), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.casingMajor, 'line-width': z([6, 1, 18, 34]) } },
    // Fills
    { id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 14, filter: roadClass(['path', 'track']), paint: { 'line-color': c.path, 'line-width': z([14, 0.6, 18, 2]), 'line-dasharray': [2, 1.5] } },
    { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: roadClass(['rail', 'transit']), paint: { 'line-color': c.rail, 'line-width': z([11, 0.6, 18, 2.4]) } },
    { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: roadClass(minor), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.road, 'line-width': z([12, 0.5, 18, 16]) } },
    { id: 'road-mid', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10, filter: roadClass(mid), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.road, 'line-width': z([10, 0.8, 18, 22]) } },
    { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 5, filter: roadClass(major), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.roadMajor, 'line-width': z([5, 0.6, 18, 30]) } },
    { id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': c.boundary, 'line-width': ['match', ['get', 'admin_level'], 2, 1, 0.6], 'line-dasharray': [3, 2] } },
  ]

  if (buildings3d) {
    layers.push({
      id: 'building-3d', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14,
      paint: {
        'fill-extrusion-color': c.building3d,
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.85,
      },
    })
  }

  const text = (color, halo = c.halo) => ({ 'text-color': color, 'text-halo-color': halo, 'text-halo-width': 1.4, 'text-halo-blur': 0.4 })

  layers.push(
    { id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'water_name', filter: ['==', ['geometry-type'], 'Point'], layout: { 'text-field': NAME, 'text-font': FONT_ITALIC, 'text-size': 12 }, paint: text(c.waterLabel) },
    { id: 'water-name-line', type: 'symbol', source: 'omt', 'source-layer': 'water_name', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'text-field': NAME, 'text-font': FONT_ITALIC, 'text-size': 12, 'symbol-placement': 'line' }, paint: text(c.waterLabel) },
    { id: 'road-name', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13, layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': z([13, 10, 18, 13]), 'symbol-placement': 'line', 'text-max-angle': 30 }, paint: text(c.labelSoft) },
  )

  if (detailed) {
    layers.push({
      id: 'poi', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 15,
      filter: ['<=', ['get', 'rank'], 24],
      layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': 11, 'text-max-width': 8, 'text-anchor': 'top', 'text-offset': [0, 0.2] },
      paint: text(c.labelSoft),
    })
  }

  layers.push(
    {
      id: 'place-minor', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet']]],
      layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': z([11, 10, 16, 13]), 'text-transform': 'uppercase', 'text-letter-spacing': 0.08, 'text-max-width': 8 },
      paint: text(c.labelSoft),
    },
    {
      id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 4,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: { 'text-field': NAME, 'text-font': ['match', ['get', 'class'], 'city', ['literal', FONT_BOLD], ['literal', FONT]], 'text-size': z([4, 11, 14, 20]), 'text-max-width': 8 },
      paint: text(c.labelStrong),
    },
    {
      id: 'place-country', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 8,
      filter: ['==', ['get', 'class'], 'country'],
      layout: { 'text-field': NAME, 'text-font': FONT_BOLD, 'text-size': z([2, 10, 7, 15]), 'text-transform': 'uppercase', 'text-letter-spacing': 0.12, 'text-max-width': 6 },
      paint: text(c.label),
    },
  )

  return {
    version: 8,
    name: `Eternal ${dark ? 'Night' : 'Day'}`,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
      },
    },
    layers,
  }
}
