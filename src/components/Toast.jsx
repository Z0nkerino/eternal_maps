import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store'
import { spring } from '../lib/motion'

export default function Toast() {
  const { toast, setToast } = useApp()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast, setToast])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+76px)] z-[60] flex justify-center px-4 md:top-6" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }} transition={spring}
            className="glass-strong max-w-[420px] rounded-[20px] px-4 py-2.5 text-center text-[14px] font-medium">
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
