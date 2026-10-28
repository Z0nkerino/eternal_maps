import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Navigation, Pencil, Plus, Trash2, Bookmark, Check } from 'lucide-react'
import { useApp } from '../store'
import { useArm } from '../lib/useArm'
import { haversine } from '../lib/geo'
import { spring } from '../lib/motion'
import { Button, Empty, Input, Row, SectionTitle, cx } from '../components/ui'

const EMOJIS = ['📍', '❤️', '⭐', '🏠', '💼', '☕', '🍜', '🍷', '🌳', '🏖️', '🏋️', '🛍️', '🎨', '🎵', '✈️', '🏔️', '📚', '🐾']

function ListEditor({ initial, onDone, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '📍')
  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring} className="overflow-hidden"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onDone({ name: name.trim(), emoji }) }}>
      <div className="tile mt-2 rounded-[22px] p-3">
        <Input autoFocus placeholder="List name" aria-label="List name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <div role="radiogroup" aria-label="List icon" className="mt-3 grid grid-cols-6 gap-1.5">
          {EMOJIS.map((em) => (
            <button key={em} type="button" role="radio" aria-checked={emoji === em} aria-label={em} onClick={() => setEmoji(em)}
              className={cx('tap flex items-center justify-center rounded-[14px] text-[20px] transition-colors', emoji === em ? 'bg-fg/[.12] ring-2 ring-[var(--blue)]' : 'hover:bg-fg/[.06]')}>
              {em}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" className="flex-1" type="submit" disabled={!name.trim()}>{initial ? 'Save' : 'Create list'}</Button>
        </div>
      </div>
    </motion.form>
  )
}

function ListDetail({ list, onBack }) {
  const { places, selectPlace, startRoute, removePlace, updatePlace, me, fmt, updateList, removeList, setPaletteOpen } = useApp()
  const [editing, setEditing] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [deleteArmed, armDelete] = useArm()
  const items = places.filter((p) => p.listId === list.id)
  const single = list.id === 'home' || list.id === 'work'

  return (
    <div className="scroll-y flex-1 px-3 pb-6 pt-2">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onBack} className="tap -ml-1 flex items-center justify-center rounded-full text-fg/60 hover:text-fg" aria-label="Back to lists">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-[19px] font-semibold"><span aria-hidden>{list.emoji}</span><span className="truncate">{list.name}</span></h2>
        {!list.builtin && (
          <>
            <button type="button" onClick={() => setEditing((v) => !v)} className="tap flex items-center justify-center rounded-full text-fg/55 hover:text-fg" aria-label="Edit list"><Pencil className="h-[18px] w-[18px]" /></button>
            <button type="button" onClick={() => { if (deleteArmed) { removeList(list.id); onBack() } else armDelete() }}
              className={cx('tap flex items-center justify-center rounded-full transition-colors', deleteArmed ? 'bg-fg px-3 text-[13px] font-medium text-bg' : 'text-fg/55 hover:text-fg')}
              aria-label={deleteArmed ? `Tap again to delete ${list.name} and its ${items.length} places` : 'Delete list'}>
              {deleteArmed ? 'Delete list?' : <Trash2 className="h-[18px] w-[18px]" />}
            </button>
          </>
        )}
      </div>
      <AnimatePresence>{editing && <ListEditor initial={list} onCancel={() => setEditing(false)} onDone={(v) => { updateList(list.id, v); setEditing(false) }} />}</AnimatePresence>

      {items.length === 0 ? (
        <Empty icon={Bookmark} title={single ? `${list.name} isn’t set yet` : 'Nothing here yet'}
          action={<Button variant="secondary" size="sm" onClick={() => setPaletteOpen(true)}>Find a place</Button>}>
          {single ? `Search for your ${list.name.toLowerCase()}, open it, then tap Save → ${list.name}.` : 'Open any place and tap Save to add it to this list.'}
        </Empty>
      ) : (
        <ul className="mt-2">
          {items.map((p) => (
            <li key={p.id} className="group">
              {renaming === p.id ? (
                <form className="flex items-center gap-2 px-1 py-1" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('n'); if (v?.trim()) updatePlace(p.id, { name: v.trim() }); setRenaming(null) }}>
                  <Input name="n" autoFocus defaultValue={p.name} aria-label="Place name" className="flex-1" />
                  <Button variant="primary" size="sm" type="submit" aria-label="Save name"><Check className="h-4 w-4" /></Button>
                </form>
              ) : (
                <div className="flex items-center">
                  <Row
                    className="min-w-0 flex-1"
                    onClick={() => selectPlace({ ...p, id: p.sourceId || p.id })}
                    leading={<span aria-hidden>{list.emoji}</span>}
                    title={p.name}
                    subtitle={[me ? fmt(haversine(me, p)) : null, p.address].filter(Boolean).join(' · ')}
                  />
                  <button type="button" aria-label={`Route to ${p.name}`} onClick={() => startRoute({ ...p, id: p.sourceId || p.id })} className="tap flex items-center justify-center rounded-full text-fg/60 hover:text-fg"><Navigation className="h-[18px] w-[18px]" /></button>
                  <button type="button" aria-label={`Rename ${p.name}`} onClick={() => setRenaming(p.id)} className="tap flex items-center justify-center rounded-full text-fg/50 hover:text-fg"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => removePlace(p.id)} className="tap flex items-center justify-center rounded-full text-fg/50 hover:text-fg"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Saved() {
  const { lists, places, addList } = useApp()
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  const list = lists.find((l) => l.id === open)
  if (list) return <ListDetail list={list} onBack={() => setOpen(null)} />

  return (
    <div className="scroll-y flex-1 px-3 pb-6 pt-1">
      <SectionTitle action={!creating && <button type="button" onClick={() => setCreating(true)} className="flex min-h-[36px] items-center gap-1 rounded-full px-2 text-[14px] font-medium text-fg/60 hover:text-fg"><Plus className="h-4 w-4" />New list</button>}>
        Your lists
      </SectionTitle>
      <AnimatePresence>{creating && <ListEditor onCancel={() => setCreating(false)} onDone={({ name, emoji }) => { const l = addList(name, emoji); setCreating(false); setOpen(l.id) }} />}</AnimatePresence>
      <ul className="mt-1">
        {lists.map((l) => {
          const items = places.filter((p) => p.listId === l.id)
          const single = l.id === 'home' || l.id === 'work'
          return (
            <li key={l.id}>
              <Row onClick={() => setOpen(l.id)} leading={<span aria-hidden>{l.emoji}</span>} title={l.name}
                subtitle={single ? items[0]?.address || items[0]?.name || 'Not set' : `${items.length} ${items.length === 1 ? 'place' : 'places'}`}
                trailing={<ChevronRight className="h-[18px] w-[18px] shrink-0 text-fg/35" aria-hidden />} />
            </li>
          )
        })}
      </ul>
      {places.length === 0 && (
        <p className="mt-4 px-2 text-center text-[13px] leading-relaxed text-fg/50">Your saved places stay on this device. Nothing leaves it unless you export.</p>
      )}
    </div>
  )
}
