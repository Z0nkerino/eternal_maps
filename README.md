# Eternal Maps

**Your places, routes and journeys — in one calm place.**
A product of **Eternal Inc.**, and a sibling of [Universal Planner](https://github.com/Z0nkerino/universal): same design, same Afina assistant.

Private by design: your places live on your device. No accounts, no tracking, no ads. Works on Mac, Windows, Android, iPhone, iPad and in any modern browser.

## Get the app

Every release is on the [Releases page](https://github.com/Z0nkerino/eternal_maps/releases/latest).

| Platform | Download | Updates |
| --- | --- | --- |
| **Mac** | `Eternal-Maps-<version>-mac.dmg` (Apple Silicon + Intel) | Automatic, in the background |
| **Windows** | `Eternal-Maps-<version>-windows-setup.exe` | Automatic, in the background |
| **Android** | `Eternal-Maps-<version>-android.apk` | The app offers each new APK |
| **iPhone / iPad** | `Eternal-Maps-<version>-iphone.ipa`, or the web app in Safari → Share → **Add to Home Screen** | The app points you to each new release · web app: automatic |
| **Any browser** | The web app at `https://z0nkerino.github.io/eternal_maps/` | Automatic |

**Mac, first launch:** the app isn't notarized yet (that needs a paid Apple Developer account), so macOS blocks it the first time. Open **System Settings → Privacy & Security** and click **Open Anyway**. After that it opens normally.

**Windows, first launch:** SmartScreen may say "Windows protected your PC" because the installer isn't code-signed yet. Click **More info → Run anyway**.

**Android:** open the `.apk` on your phone and allow your browser to install apps when asked.

**iPhone:** the `.ipa` is a real native app, but it isn't signed yet (the App Store and TestFlight need a paid Apple Developer account, $99/year). Until then, install it with [AltStore](https://altstore.io) or [Sideloadly](https://sideloadly.io) using your free Apple ID; apps installed that way must be refreshed every 7 days. The easiest option is the web app: open it in Safari → Share → **Add to Home Screen**. It has its own icon and keeps your places on the device.

## Develop

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production web build in dist/
npm run preview    # serves dist/ at http://localhost:4173
```

Desktop and Android builds:

```bash
npm run desktop     # build and run the desktop app locally
npm run dist:mac    # on a Mac: release/Eternal-Maps-<version>-mac.dmg
npm run dist:win    # on Windows: release/Eternal-Maps-<version>-windows-setup.exe
npm run android     # build the web app into the Android project (then open android/ in Android Studio)
npm run ios         # on a Mac: build into the iPhone project (then open ios/App/App.xcworkspace in Xcode)
npm run brand       # re-render every icon from public/icon.svg
```

## Releasing

```bash
npm version minor --no-git-tag-version   # e.g. 0.1.0 → 0.2.0
git commit -am "Release 0.2.0" && git push
```

When a push to `main` carries a version with no release yet, the **Apps** GitHub workflow builds the Mac `.dmg`, the Windows installer, the Android `.apk`, the iPhone `.ipa` and the desktop update bundle. It publishes them as a GitHub Release and deploys the web app to the `gh-pages` branch.

### One-time setup

- **Web app hosting:** in the repository's **Settings → Pages**, set the source to **Deploy from a branch → `gh-pages` / root**.
- **Android signing key:** add two repository secrets under **Settings → Secrets and variables → Actions**:
  - `ANDROID_KEYSTORE`: the keystore file, base64-encoded
  - `ANDROID_KEYSTORE_PASSWORD`: its password

  Create the key once with:

  ```bash
  keytool -genkeypair -keystore em.keystore -alias eternal-maps -keyalg RSA -keysize 2048 -validity 36500
  base64 -w0 em.keystore   # paste the output into ANDROID_KEYSTORE
  ```

  Keep the keystore safe and never commit it. Android only installs an update if it's signed with the same key. Without the secrets, CI signs each APK with a throwaway key, and you'd have to uninstall before installing a newer version.

### How updates work

- **Desktop:** apps check the latest release when they open and every 4 hours. They download the new content in the background, verify its SHA-256 checksum, then offer **Restart**. If a new version fails to start, the app rolls back by itself. If a release changes the Electron shell (`updates.shellVersion` in `package.json`), apps offer the new installer instead.
- **Android / iPhone:** the app reads the same `latest.json` feed and offers the new APK, or links to the new release on iPhone.
- **Web / home-screen app:** the service worker picks up the new version on the next launch.

Release files must be downloadable without signing in, so the repository has to be public.

## Stack
Vite · React · Tailwind · Framer Motion · lucide-react · MapLibre GL JS. Electron for Mac/Windows, Capacitor for Android — the same shells as Universal Planner.
No API keys: tiles from [OpenFreeMap](https://openfreemap.org), search from Nominatim, routing from OSRM
(`routing.openstreetmap.de` for walk / cycle / drive). Please respect the
[Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) — for heavy traffic, self-host or switch providers in `src/lib/api.js`.

## Where things live
| | |
|---|---|
| `src/index.css` | Design tokens (copied from Planner — keep them in sync) and glass utilities |
| `src/lib/mapStyle.js` | Minimal monochrome map style, light + dark |
| `src/lib/afina.js` | Afina's local command parser (no AI service) |
| `src/store.jsx` | App state, persistence, routing and Afina actions |
| `src/components/` | Map, search palette, sheet/sidebar, place card, controls |
| `src/tabs/` | Explore, Saved, Routes, Afina, Settings |
| `public/icon.svg` | App icon — Planner's construction with the Maps mark (`npm run brand` renders the PNGs) |
| `electron/` | Desktop shell and self-updater (shared with Planner) |
| `android/`, `ios/` | Android and iPhone apps (Capacitor) |

## Storage
Everything is in `localStorage` under `em.` — `em.theme` (`system` / `light` / `dark`), `em.settings`, `em.lists`,
`em.places`, `em.recents`, `em.routes`, `em.afina`. Settings → Export / Import moves it as JSON.

## Deep links (for Universal Planner)
Planner can open an event location with `https://z0nkerino.github.io/eternal_maps/` plus:
- `?q=Café de Flore, Paris` — searches and opens the first result
- `?lat=48.8584&lng=2.2945&name=Eiffel Tower` — opens a pin (`name` optional)

## Afina examples
“route home”, “route to work”, “cafés near me”, “walk to the nearest park”, “save this as Gym”,
“save this to Want to go”, “set as home”, “how far is the Louvre”, “cycle to Central Park”, “where am I”,
“use miles”, “dark mode”, “clear route”.
