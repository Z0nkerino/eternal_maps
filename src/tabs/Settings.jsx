import { useRef } from 'react'
import { Download, Upload, Trash2, RefreshCw, Loader2, Monitor, Sun, Moon, Footprints, Bike, Car, Shield, CalendarDays } from 'lucide-react'
import { useApp } from '../store'
import { clearAll, exportAll, importAll } from '../lib/storage'
import { mobileApp, appUpdater, APP_VERSION, saveTextFile, useUpdates } from '../lib/desktop'
import { useArm } from '../lib/useArm'
import { AppIcon, Button, Segmented, SectionTitle, Toggle } from '../components/ui'

export const VERSION = 'Beta 0.1'

export default function Settings() {
  const { theme, setTheme, settings, setSettings, notify } = useApp()
  const file = useRef(null)
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }))

  const [eraseArmed, armErase] = useArm()

  const { status: update } = useUpdates()

  const doExport = async () => {
    const json = JSON.stringify(exportAll(), null, 2)
    try {
      if (mobileApp) {
        // Phone app web views can't download files, so the export goes to the clipboard.
        await navigator.clipboard.writeText(json)
        notify('Export copied — paste it into a note or file to keep it')
        return
      }
      saveTextFile(`eternal-maps-${new Date().toISOString().slice(0, 10)}.json`, json)
      notify('Exported your places and settings')
    } catch {
      notify('Couldn’t save the export. Try again in a moment.')
    }
  }

  const updateLabel = {
    checking: 'Checking for updates…',
    downloading: `Downloading ${update.version ?? 'update'}…`,
    current: 'You’re up to date',
    ready: `Version ${update.version} is ready — restart to switch`,
    installer: `Version ${update.version} is available`,
    unavailable: 'No published updates yet',
    error: update.message || 'Couldn’t check for updates',
  }[update.state]

  const doImport = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      importAll(JSON.parse(await f.text()))
      notify('Imported — reloading…')
      setTimeout(() => location.reload(), 600)
    } catch {
      notify('That file doesn’t look like an Eternal Maps export.')
    }
  }

  return (
    <div className="scroll-y flex-1 px-4 pb-8 pt-1">
      <SectionTitle>Appearance</SectionTitle>
      <Segmented label="Theme" value={theme} onChange={setTheme} options={[
        { value: 'system', label: 'System', icon: Monitor },
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
      ]} />

      <SectionTitle>Units</SectionTitle>
      <Segmented label="Units" value={settings.units} onChange={(units) => set({ units })} options={[
        { value: 'km', label: 'Kilometres' },
        { value: 'mi', label: 'Miles' },
      ]} />

      <SectionTitle>Default travel mode</SectionTitle>
      <Segmented label="Default travel mode" value={settings.mode} onChange={(mode) => set({ mode })} options={[
        { value: 'walk', label: 'Walk', icon: Footprints },
        { value: 'cycle', label: 'Cycle', icon: Bike },
        { value: 'drive', label: 'Drive', icon: Car },
      ]} />

      <SectionTitle>Map</SectionTitle>
      <div className="tile rounded-[20px] px-3 py-1">
        <Toggle label="Show points of interest" description="Shops, cafés and landmarks on the map" checked={settings.detailed} onChange={(detailed) => set({ detailed })} />
        <div className="h-px bg-fg/[.06]" />
        <Toggle label="3D buildings" description="Tilts the map in cities" checked={settings.buildings3d} onChange={(buildings3d) => set({ buildings3d })} />
      </div>

      <SectionTitle>Your data</SectionTitle>
      <div className="tile rounded-[20px] p-3">
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-fg/60">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Everything stays on this device. No account, no tracking, no ads. Search and routes ask OpenStreetMap services, without anything that identifies you.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" icon={Download} onClick={doExport}>Export</Button>
          <Button size="sm" icon={Upload} onClick={() => file.current?.click()}>Import</Button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={doImport} aria-label="Import Eternal Maps data" />
        <Button size="sm" variant={eraseArmed ? 'secondary' : 'ghost'} icon={Trash2} className={eraseArmed ? 'mt-1 w-full' : 'mt-1 w-full text-fg/55'}
          onClick={() => { if (eraseArmed) { clearAll(); location.reload() } else armErase() }}>
          {eraseArmed ? 'Tap again to erase everything' : 'Erase all data'}
        </Button>
      </div>

      <SectionTitle>About</SectionTitle>
      <div className="tile flex flex-col items-center rounded-[24px] px-4 pb-5 pt-6 text-center">
        <AppIcon size={72} className="rounded-[16px] shadow-[0_10px_30px_-12px_rgb(47_107_255/.6)]" />
        <p className="mt-3 text-[18px] font-semibold">Eternal Maps</p>
        <p className="text-[13px] text-fg/50">Version {VERSION} ({APP_VERSION}) · by Eternal Inc.</p>
        {appUpdater && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            {update.state === 'ready' ? (
              <Button size="sm" variant="primary" icon={RefreshCw} onClick={() => appUpdater.apply()}>Restart to update</Button>
            ) : update.state === 'installer' ? (
              <Button size="sm" variant="primary" icon={Download} onClick={() => appUpdater.download(update.url)}>Download {update.version}</Button>
            ) : (
              <Button size="sm" icon={update.state === 'checking' || update.state === 'downloading' ? Loader2 : RefreshCw} onClick={() => appUpdater.check()}
                disabled={update.state === 'checking' || update.state === 'downloading'}>Check for updates</Button>
            )}
            {updateLabel && <p className="text-[12px] text-fg/45" role="status">{updateLabel}</p>}
          </div>
        )}
        <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-fg/60">Your places, routes and journeys — in one calm place. Private, by Eternal Inc.</p>
        <p className="mt-3 text-[12px] text-fg/40">Map data © OpenStreetMap contributors · Tiles by OpenFreeMap · Search by Nominatim · Routing by OSRM</p>
      </div>

      <div className="mt-6 px-1">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[.08em] text-fg/40">Made by Eternal Inc.</p>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          <li className="tile flex items-center gap-2.5 rounded-[18px] p-2.5">
            <AppIcon size={36} className="shrink-0 rounded-[10px]" />
            <span className="min-w-0 text-left">
              <span className="block truncate text-[14px] font-semibold">Eternal Maps</span>
              <span className="block text-[12px] text-fg/45">You’re here</span>
            </span>
          </li>
          <li className="tile flex items-center gap-2.5 rounded-[18px] p-2.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#0A0A0A]">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgb(47_107_255/.55),rgb(255_79_163/.22)_55%,transparent_75%)]" />
              <CalendarDays className="relative h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[14px] font-semibold">Universal Planner</span>
              <span className="block text-[12px] text-fg/45">Calendar, tasks, notes</span>
            </span>
          </li>
        </ul>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-fg/40">Events with a location in Universal Planner open right here.</p>
      </div>
    </div>
  )
}
