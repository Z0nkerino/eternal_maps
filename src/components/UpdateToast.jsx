import { AnimatePresence, motion } from 'framer-motion'
import { Download, RefreshCw, X } from 'lucide-react'
import { appUpdater, useUpdates } from '../lib/desktop'
import { spring } from '../lib/motion'
import { AppIcon, Button } from './ui'

/** Desktop and Android apps only: offers a downloaded update, or a new installer. Same as Universal Planner. */
export default function UpdateToast() {
  const { status, dismissed, dismiss } = useUpdates()
  const show = !!appUpdater && (status.state === 'ready' || status.state === 'installer') && dismissed !== status.version

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={spring}
          className="glass-strong fixed right-4 top-[calc(var(--safe-top)+76px)] z-[55] flex w-[min(380px,calc(100vw-2rem))] items-center gap-3 rounded-[22px] p-3.5 md:bottom-6 md:right-6 md:top-auto"
        >
          <AppIcon size={40} className="shrink-0 rounded-[10px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-[-0.01em]">{status.state === 'ready' ? 'Update ready' : 'New version available'}</p>
            <p className="truncate text-[13px] text-fg/60">
              Version {status.version}. {status.state === 'ready' ? 'Restart to switch.' : 'Needs a fresh download.'}
            </p>
          </div>
          {status.state === 'ready' ? (
            <Button size="sm" variant="primary" icon={RefreshCw} onClick={() => void appUpdater.apply()}>Restart</Button>
          ) : (
            <Button size="sm" variant="primary" icon={Download} onClick={() => void appUpdater.download(status.url)}>Download</Button>
          )}
          <button type="button" onClick={dismiss} aria-label="Later" className="tap -mr-1 flex items-center justify-center rounded-full text-fg/50 hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
