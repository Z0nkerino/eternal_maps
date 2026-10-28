// Afina — the built-in Eternal assistant. Commands are parsed locally; nothing is sent to an AI service.
// Returns an intent object; the store turns intents into actions.

const MODES = [
  [/\b(walk|walking|on foot|by foot)\b/, 'walk'],
  [/\b(drive|driving|car|by car)\b/, 'drive'],
  [/\b(cycle|cycling|bike|biking|bicycle)\b/, 'cycle'],
]

function pickMode(t) {
  for (const [re, m] of MODES) if (re.test(t)) return m
  return null
}

function stripMode(t) {
  return t
    .replace(/\b(by|on|via)\s+(foot|car|bike|bicycle)\b/g, '')
    .replace(/\b(walking|driving|cycling|biking)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const clean = (s) => s.replace(/^["'“”‘’]+|["'“”‘’.!?]+$/g, '').trim()

export function parseCommand(input) {
  const raw = input.trim().replace(/\s+/g, ' ')
  const t = raw.toLowerCase()
  // Recover the original casing of a lowercase fragment (e.g. place names).
  const orig = (frag) => {
    const i = t.lastIndexOf(frag)
    return i < 0 ? frag : raw.slice(i, i + frag.length)
  }
  if (!t) return { type: 'empty' }

  if (/^(help|\?|what can you do|commands)\b/.test(t)) return { type: 'help' }
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t)) return { type: 'hello' }
  if (/\b(thank|thanks|thx)\b/.test(t)) return { type: 'thanks' }

  // Theme & settings
  if (/\b(dark mode|night mode|go dark|theme dark)\b/.test(t)) return { type: 'theme', value: 'dark' }
  if (/\b(light mode|day mode|go light|theme light)\b/.test(t)) return { type: 'theme', value: 'light' }
  if (/\b(system theme|theme system|auto theme|match system)\b/.test(t)) return { type: 'theme', value: 'system' }
  if (/\b(use )?(miles|imperial)\b/.test(t) && !/\bwithin\b/.test(t)) return { type: 'units', value: 'mi' }
  if (/\b(use )?(kilometers|kilometres|km|metric)\b$/.test(t) && t.split(' ').length <= 3) return { type: 'units', value: 'km' }
  if (/^(default|always) (to )?(walk|walking|drive|driving|cycle|cycling|bike)/.test(t)) return { type: 'defaultMode', value: pickMode(t) }

  // Map
  if (/^zoom in\b/.test(t)) return { type: 'zoom', value: 1 }
  if (/^zoom out\b/.test(t)) return { type: 'zoom', value: -1 }
  if (/\b(where am i|my location|locate me|find me|show me)\b$/.test(t)) return { type: 'whereAmI' }
  if (/\b(north up|reset north|face north)\b/.test(t)) return { type: 'north' }
  if (/^(clear|cancel|stop|end) (the )?(route|directions|navigation)/.test(t)) return { type: 'clearRoute' }
  if (/^(3d|three d)( buildings)?( on)?$/.test(t)) return { type: 'toggle3d' }

  // Navigation tabs
  if (/^(open |show )?(my )?(saved|favorites|favourites|lists)( places)?$/.test(t)) return { type: 'tab', value: 'saved' }
  if (/^(open |show )?settings$/.test(t)) return { type: 'tab', value: 'settings' }
  if (/^(open |show )?(routes|recent routes)$/.test(t)) return { type: 'tab', value: 'routes' }

  // Save
  let m = t.match(/^(save|bookmark|remember|pin|favou?rite)( this| it| here| this place| my location| current location)?( as| to| in| into)? ?(.*)$/)
  if (m) {
    const target = clean(raw.slice(raw.length - m[4].length))
    const preposition = (m[3] || '').trim()
    const here = /my location|current location|here/.test(m[2] || '')
    if (/^(home|work)$/.test(target.toLowerCase())) return { type: 'save', list: target.toLowerCase(), here }
    if (preposition === 'to' || preposition === 'in' || preposition === 'into') return { type: 'save', list: target, here }
    return { type: 'save', name: target || null, here }
  }
  m = t.match(/^set (this|here|my location)? ?(as )?(my )?(home|work)$/) || t.match(/^(this is|make this) (my )?(home|work)$/)
  if (m) return { type: 'save', list: m[m.length - 1], here: /here|my location/.test(t) }

  // Distance
  m = t.match(/^(how far|distance)( is it| is)?( it is)?( to| from here to)? (.+)$/)
  if (m) return { type: 'distance', query: clean(orig(stripMode(m[5]))) }

  // Route
  m = t.match(/^(route|directions?|navigate|take me|go|get me|how do i get|guide me|walk|drive|cycle|bike|ride)( me)?( to| home| to work)? ?(.*)$/)
  if (m && (m[3] || m[4] || /^(route|navigate|directions?)/.test(t))) {
    const mode = pickMode(t)
    let dest = m[3]?.trim() === 'home' ? 'home' : m[3]?.trim() === 'to work' ? 'work' : clean(stripMode(m[4] || ''))
    dest = dest.replace(/^(to|the) /, '').trim()
    if (dest !== 'home' && dest !== 'work' && !/^(nearest|closest) /.test(dest)) dest = orig(dest)
    if (!dest || dest === 'there' || dest === 'this' || dest === 'here') return { type: 'route', dest: null, mode }
    return { type: 'route', dest, mode }
  }

  // Nearby
  m = t.match(/^(find |show |search )?(an? |some |the )?(.+?) (near me|nearby|around me|around here|close by|near here)$/) ||
      t.match(/^(nearest|closest) (.+)$/)
  if (m) {
    const what = clean(orig(m.length === 3 ? m[2] : m[3]))
    return { type: 'nearby', query: what }
  }

  m = t.match(/^(find|search|search for|show|where is|where's|look up) (.+)$/)
  if (m) return { type: 'search', query: clean(orig(m[2])) }

  return { type: 'search', query: clean(raw), fallback: true }
}

export const AFINA_EXAMPLES = [
  'Route home',
  'Cafés near me',
  'Save this as Gym',
  'Walk to the nearest park',
  'How far is the Louvre',
  'Dark mode',
]

export const AFINA_HELP =
  'I can find places, plan routes and keep your lists tidy. Try “route home”, “cafés near me”, “save this as Gym”, “cycle to Central Park”, “how far is the station”, “use miles” or “dark mode”.'
