import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { CATEGORIAS } from '../lib/slots'

const spring = { type: 'spring', bounce: 0.15, duration: 0.45 }

/** Hoja inferior en móvil / diálogo centrado en escritorio. */
export default function Editor({ slot, dia, registro, onSave, onDelete, onClose }) {
  const [actividad, setActividad] = useState(registro?.actividad ?? '')
  const [categoria, setCategoria] = useState(registro?.categoria ?? CATEGORIAS[0].id)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ actividad: actividad.trim(), categoria })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Registrar ${slot.label}`}>
      <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
      <motion.form
        onSubmit={submit}
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={spring}
        className="relative w-full max-w-md space-y-4 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.08)] ring-1 ring-zinc-950/5 sm:rounded-3xl dark:bg-zinc-900 dark:ring-white/10"
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400">{dia}</p>
          <h2 className="text-lg font-semibold tracking-tight tabular-nums">{slot.label}</h2>
        </div>

        <input
          ref={inputRef}
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          maxLength={200}
          required
          placeholder="¿Qué hiciste específicamente?"
          className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-[16px] outline-none ring-1 ring-transparent transition-shadow placeholder:text-zinc-400 focus:ring-zinc-900 dark:bg-zinc-800 dark:focus:ring-zinc-100"
        />

        <div className="grid gap-1.5" role="radiogroup" aria-label="Categoría">
          {CATEGORIAS.map((c) => {
            const on = categoria === c.id
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCategoria(c.id)} className="btn-press relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm">
                {on && <motion.span layoutId="cat-pill" transition={spring} className="absolute inset-0 rounded-xl bg-zinc-100 ring-1 ring-zinc-900/10 dark:bg-zinc-800 dark:ring-white/15" />}
                <span className={`relative size-2 rounded-full ${c.dot}`} />
                <span className="relative">
                  <span className="font-medium">{c.label}</span>
                  <span className="ml-2 text-zinc-400">{c.hint}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 pt-1">
          {registro && (
            <button type="button" onClick={onDelete} aria-label="Borrar registro" className="btn-press grid size-12 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Trash2 className="size-4" />
            </button>
          )}
          <button disabled={saving || !actividad.trim()} className="btn-press h-12 flex-1 rounded-xl bg-zinc-900 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
            Asentar movimiento
          </button>
        </div>
      </motion.form>
    </div>
  )
}
