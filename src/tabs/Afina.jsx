import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Sparkles } from 'lucide-react'
import { useApp } from '../store'
import { AFINA_EXAMPLES } from '../lib/afina'
import { spring } from '../lib/motion'
import { cx } from '../components/ui'

export default function Afina() {
  const { afinaLog, setAfinaLog, afinaBusy, runAfina, selected } = useApp()
  const [text, setText] = useState('')
  const scroller = useRef(null)
  const input = useRef(null)

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }) }, [afinaLog.length, afinaBusy])

  const send = (t = text) => {
    if (!t.trim() || afinaBusy) return
    setText('')
    runAfina(t)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="scroll-y flex-1 px-4 pb-3 pt-3" aria-live="polite" aria-busy={afinaBusy}>
        {afinaLog.length === 0 ? (
          <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
            <div className="brand-fill mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] shadow-[0_10px_30px_-10px_rgb(47_107_255/.7)]">
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </div>
            <p className="text-[17px] font-semibold">Hi, I’m Afina</p>
            <p className="mt-1 max-w-[280px] text-[14px] leading-relaxed text-fg/55">Tell me where you want to go. I work right here on your device — nothing you say leaves it.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {afinaLog.map((m) => (
              <motion.li key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                className={cx('max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-[15px] leading-snug', m.role === 'user' ? 'self-end bg-fg text-bg rounded-br-[8px]' : 'tile self-start rounded-bl-[8px]')}>
                {m.role === 'afina' && <span className="sr-only">Afina: </span>}
                {m.text}
              </motion.li>
            ))}
          </ul>
        )}
        <AnimatePresence>
          {afinaBusy && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="mt-2 flex items-center gap-2 px-1 text-[13px] text-fg/55" role="status">
              <span className="em-dots" aria-hidden><span /><span /><span /></span> Afina is thinking
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <div className="no-scrollbar -mx-3 mb-2 flex gap-2 overflow-x-auto px-3">
          {(selected ? [`Save this as ${selected.name.split(' ')[0]}`, 'Route there', ...AFINA_EXAMPLES] : AFINA_EXAMPLES).slice(0, 6).map((ex) => (
            <button key={ex} type="button" disabled={afinaBusy} onClick={() => send(ex)}
              className="tile min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium text-fg/75 transition-colors hover:bg-fg/[.07] hover:text-fg disabled:opacity-50">
              {ex}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="tile flex items-center gap-2 rounded-full p-1.5 pl-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--blue)]">
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Afina… “route home”" aria-label="Message Afina"
            enterKeyHint="send" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none" />
          <motion.button type="submit" whileTap={{ scale: 0.9 }} transition={spring} disabled={!text.trim() || afinaBusy} aria-label="Send"
            className="brand-fill flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-35">
            <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
          </motion.button>
        </form>
        {afinaLog.length > 0 && (
          <button type="button" onClick={() => setAfinaLog([])} className="mx-auto mt-1 block rounded-full px-3 py-1.5 text-[12px] font-medium text-fg/40 hover:text-fg/70">Clear conversation</button>
        )}
      </div>
    </div>
  )
}
