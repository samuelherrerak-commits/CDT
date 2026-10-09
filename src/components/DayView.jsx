import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { SLOTS, catById } from '../lib/slots'
import { addDays, formatDay, toISO } from '../lib/dates'

/** Bloques de hoy que ya empezaron y siguen sin registro. */
export const pendientesDeHoy = (registros, hoy, minutosAhora) =>
  SLOTS.filter((s) => s.start <= minutosAhora && !registros.has(`${hoy}|${s.id}`))

export default function DayView({ dia, setDia, registros, onPick, minutosAhora }) {
  const hoy = toISO(new Date())
  const esHoy = dia === hoy
  const [verHechos, setVerHechos] = useState(false)
  const hechos = SLOTS.filter((s) => registros.has(`${dia}|${s.id}`))
  const pendientes = esHoy ? pendientesDeHoy(registros, hoy, minutosAhora) : []

  // Hoy: solo lo pendiente (+ lo ya registrado, plegado). Otros días: la grilla completa para poder corregir.
  const principal = esHoy ? pendientes : SLOTS.filter((s) => dia < hoy)
  const hechosHoy = esHoy ? hechos : []

  const row = (s) => <SlotRow key={s.id} slot={s} registro={registros.get(`${dia}|${s.id}`)} activo={esHoy && s.start <= minutosAhora && minutosAhora < s.start + 30} onPick={onPick} />

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium capitalize">{esHoy ? 'Hoy' : formatDay(dia, { weekday: 'long' })}</h2>
          <p className="text-sm text-zinc-500 first-letter:uppercase">{formatDay(dia, { day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-1">
          <NavBtn label="Día anterior" onClick={() => setDia(addDays(dia, -1))}><ChevronLeft className="size-4" /></NavBtn>
          <NavBtn label="Día siguiente" disabled={dia >= hoy} onClick={() => setDia(addDays(dia, 1))}><ChevronRight className="size-4" /></NavBtn>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-300">
          <motion.div className="h-full rounded-full bg-brand" initial={false} animate={{ width: `${(hechos.length / SLOTS.length) * 100}%` }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} />
        </div>
        <span className="text-xs tabular-nums text-zinc-500">{hechos.length}/{SLOTS.length}</span>
      </div>

      {esHoy && (
        <p className="mt-7 text-sm font-medium text-zinc-600">
          Por registrar {pendientes.length > 0 && <span className="tabular-nums">· {pendientes.length}</span>}
        </p>
      )}

      {esHoy && pendientes.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-900/10">
          <span className="grid size-8 place-items-center rounded-full bg-brand-tint text-brand-deep"><Check className="size-4" /></span>
          <p className="text-sm text-zinc-600">Estás al día. El próximo bloque se habilita en :00 o :30.</p>
        </motion.div>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-200/70">
          <AnimatePresence initial={false}>{principal.map(row)}</AnimatePresence>
        </ul>
      )}

      {esHoy && hechosHoy.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setVerHechos((v) => !v)} aria-expanded={verHechos} className="btn-press flex items-center gap-1.5 text-sm text-zinc-500">
            Registrados hoy · {hechosHoy.length}
            <ChevronDown className={`size-4 transition-transform duration-200 ${verHechos ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {verHechos && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="divide-y divide-zinc-200/70 overflow-hidden">
                {hechosHoy.map(row)}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

function SlotRow({ slot, registro, activo, onPick }) {
  const cat = registro && catById(registro.categoria)
  return (
    <motion.li layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
      <button onClick={() => onPick(slot)} className="btn-press flex w-full items-center gap-4 py-3 text-left">
        <span className={`w-[8.5rem] shrink-0 text-xs tabular-nums ${activo ? 'font-semibold text-zinc-900' : 'text-zinc-400'}`}>{slot.label}</span>
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          {cat && <span className={`size-2 shrink-0 rounded-full ${cat.dot}`} title={cat.label} />}
          <span className={`truncate text-sm ${registro ? '' : 'text-zinc-400'}`}>{registro ? registro.actividad : 'No registré'}</span>
        </span>
        {activo && !registro && <span className="rounded-full bg-brand-deep px-2 py-0.5 text-[11px] font-medium text-white">Ahora</span>}
      </button>
    </motion.li>
  )
}

function NavBtn({ label, children, ...p }) {
  return (
    <button aria-label={label} {...p} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200 disabled:opacity-30">
      {children}
    </button>
  )
}
