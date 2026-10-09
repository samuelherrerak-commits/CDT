import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIAS } from '../lib/slots'
import { addDays, formatDay, toISO, weekStart } from '../lib/dates'
import { estadoResultados } from '../lib/resultados'

const fmtH = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`
const ease = [0.23, 1, 0.32, 1]

export default function EstadoResultados({ dia, setDia, registros }) {
  const lunes = weekStart(dia)
  const domingo = addDays(lunes, 6)
  const esActual = weekStart(toISO(new Date())) === lunes
  const er = estadoResultados([...registros.values()].filter((r) => r.fecha >= lunes && r.fecha <= domingo), dia)

  const filas = [
    ...CATEGORIAS.map((c) => ({ key: c.id, label: c.label, dot: c.dot, h: er.horas[c.id] })),
    { key: 'sin', label: 'Sin registrar', dot: 'bg-zinc-300 dark:bg-zinc-600', h: er.sinRegistrar },
  ]
  const utilidad = er.horas.inversion - er.horas.gasto

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Estado de resultados</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {formatDay(lunes, { day: 'numeric', month: 'short' })} – {formatDay(domingo, { day: 'numeric', month: 'short' })}
          </h2>
        </div>
        <div className="flex gap-1">
          <button aria-label="Semana anterior" onClick={() => setDia(addDays(lunes, -7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"><ChevronLeft className="size-4" /></button>
          <button aria-label="Semana siguiente" disabled={esActual} onClick={() => setDia(addDays(lunes, 7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200/60 disabled:opacity-30 dark:hover:bg-zinc-800"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-500">Capital de tiempo{esActual ? ' transcurrido' : ''}</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight">{fmtH(er.capital)}</span>
        </div>

        <ul className="mt-5 space-y-4">
          {filas.map((f, i) => (
            <li key={f.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className={`size-2 rounded-full ${f.dot}`} />{f.label}</span>
                <span className="tabular-nums text-zinc-500">{fmtH(f.h)} · {er.capital ? Math.round((f.h / er.capital) * 100) : 0}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <motion.div
                  key={`${lunes}-${f.key}`}
                  className={`h-full rounded-full ${f.dot}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${er.capital ? (f.h / er.capital) * 100 : 0}%` }}
                  transition={{ duration: 0.7, ease, delay: i * 0.06 }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-baseline justify-between border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
          <span className="text-sm font-medium">Utilidad neta <span className="font-normal text-zinc-400">(inversión − gasto)</span></span>
          <span className={`text-lg font-semibold tabular-nums ${utilidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {utilidad > 0 ? '+' : ''}{fmtH(utilidad)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5" aria-label="Bloques registrados por día">
        {er.porDia.map((d) => (
          <div key={d.fecha} className="text-center">
            <div className="grid h-14 place-items-end rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <motion.div className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100" initial={{ height: 0 }} animate={{ height: `${(d.bloques / 32) * 100}%` }} transition={{ duration: 0.6, ease }} />
            </div>
            <span className="mt-1 block text-[10px] uppercase text-zinc-400">{formatDay(d.fecha, { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
