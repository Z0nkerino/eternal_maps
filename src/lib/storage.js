// Local-first storage. Everything lives in localStorage under "em." (Planner uses "up.").
export const PREFIX = 'em.'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return key === 'theme' ? raw : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, key === 'theme' ? value : JSON.stringify(value))
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

export function exportAll() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(PREFIX)) continue
    const raw = localStorage.getItem(k)
    try { data[k.slice(PREFIX.length)] = JSON.parse(raw) } catch { data[k.slice(PREFIX.length)] = raw }
  }
  return { app: 'Eternal Maps', developer: 'Eternal Inc.', version: 'Beta 0.1', exportedAt: new Date().toISOString(), data }
}

export function importAll(json) {
  const data = json?.data
  if (!data || typeof data !== 'object' || json.app !== 'Eternal Maps') throw new Error('not-eternal-maps')
  for (const [k, v] of Object.entries(data)) save(k, v)
}

export function clearAll() {
  Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k))
}
