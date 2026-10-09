import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SLOTS, catById, currentSlot } from '../lib/slots'
import { addDays, formatDay, toISO } from '../lib/dates'

export default function DayView({ dia, setDia, registros, onPick }) {
  const hoy = toISO(new Date())
  const ahora = currentSlot()
  const hechos = SLOTS.filter((s) => registros.has(`${dia}|${s.id}`)).length

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold capitalize tracking-tight">{dia === hoy ? 'Hoy' : formatDay(dia, { weekday: 'long' })}</h2>
          <p className="text-sm text-zinc-500 first-letter:uppercase">{formatDay(dia, { day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-1">
          <NavBtn label="Día anterior" onClick={() => setDia(addDays(dia, -1))}><ChevronLeft className="size-4" /></NavBtn>
          <NavBtn label="Día siguiente" disabled={dia >= hoy} onClick={() => setDia(addDays(dia, 1))}><ChevronRight className="size-4" /></NavBtn>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <motion.div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100" initial={false} animate={{ width: `${(hechos / SLOTS.length) * 100}%` }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} />
        </div>
        <span className="text-xs tabular-nums text-zinc-500">{hechos}/{SLOTS.length}</span>
      </div>

      <ul className="mt-4 divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
        {SLOTS.map((s) => {
          const r = registros.get(`${dia}|${s.id}`)
          const minutosAhora = new Date().getHours() * 60 + new Date().getMinutes()
          const futuro = dia > hoy || (dia === hoy && s.start > minutosAhora)
          const activo = dia === hoy && ahora?.id === s.id
          const cat = r && catById(r.categoria)
          return (
            <li key={s.id}>
              <button
                disabled={futuro}
                onClick={() => onPick(s)}
                className="btn-press group flex w-full items-center gap-4 py-3 text-left disabled:opacity-35"
              >
                <span className={`w-[8.5rem] shrink-0 text-xs tabular-nums ${activo ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                  {s.label}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  {cat && <span className={`size-2 shrink-0 rounded-full ${cat.dot}`} title={cat.label} />}
                  <span className={`truncate text-sm ${r ? '' : 'text-zinc-400'}`}>{r ? r.actividad : futuro ? '' : 'No registré'}</span>
                </span>
                {activo && !r && <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white dark:bg-zinc-100 dark:text-zinc-900">Ahora</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function NavBtn({ label, children, ...p }) {
  return (
    <button aria-label={label} {...p} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200/60 disabled:opacity-30 dark:hover:bg-zinc-800">
      {children}
    </button>
  )
}
