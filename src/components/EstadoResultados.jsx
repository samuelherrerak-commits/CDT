import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIAS } from '../lib/slots'
import { addDays, formatDay, toISO, weekStart } from '../lib/dates'
import { estadoResultados } from '../lib/resultados'

const fmtH = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`
const ease = [0.23, 1, 0.32, 1]

/** Se presenta como un estado de resultados de verdad: renglones, líneas y doble raya en el total. */
export default function EstadoResultados({ dia, setDia, registros }) {
  const lunes = weekStart(dia)
  const domingo = addDays(lunes, 6)
  const esActual = weekStart(toISO(new Date())) === lunes
  const er = estadoResultados([...registros.values()].filter((r) => r.fecha >= lunes && r.fecha <= domingo), dia)

  const filas = [
    ...CATEGORIAS.map((c) => ({ key: c.id, label: c.label, dot: c.dot, h: er.horas[c.id] })),
    { key: 'sin', label: 'Sin registrar', dot: 'bg-zinc-300', h: er.sinRegistrar },
  ]
  const utilidad = er.horas.inversion - er.horas.gasto

  return (
    <section>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-medium">Estado de resultados</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Semana del {formatDay(lunes, { day: 'numeric', month: 'long' })} al {formatDay(domingo, { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-1">
          <button aria-label="Semana anterior" onClick={() => setDia(addDays(lunes, -7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200"><ChevronLeft className="size-4" /></button>
          <button aria-label="Semana siguiente" disabled={esActual} onClick={() => setDia(addDays(lunes, 7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <dl className="mt-8">
        <div className="flex items-baseline justify-between border-b border-zinc-900 pb-2">
          <dt className="font-medium">Capital de tiempo{esActual ? ' transcurrido' : ''}</dt>
          <dd className="tnum font-medium">{fmtH(er.capital)}</dd>
        </div>

        {filas.map((f, i) => (
          <div key={f.key} className="border-b border-zinc-300 py-3.5">
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <dt className="flex items-center gap-2.5"><span className={`size-2 rounded-full ${f.dot}`} />{f.label}</dt>
              <dd className="tnum">
                {fmtH(f.h)} <span className="ml-1 inline-block w-10 text-right text-zinc-400">{er.capital ? Math.round((f.h / er.capital) * 100) : 0}%</span>
              </dd>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-zinc-200">
              <motion.div
                key={`${lunes}-${f.key}`}
                className={`h-full origin-left rounded-full ${f.dot}`}
                initial={{ width: 0 }}
                animate={{ width: `${er.capital ? (f.h / er.capital) * 100 : 0}%` }}
                transition={{ duration: 0.6, ease, delay: i * 0.05 }}
              />
            </div>
          </div>
        ))}

        <div className="mt-1 flex items-baseline justify-between border-b-[5px] border-double border-zinc-900 py-3.5">
          <dt className="font-medium">Utilidad neta <span className="font-normal text-zinc-500">(inversión − gasto)</span></dt>
          <dd className={`tnum text-lg font-medium ${utilidad >= 0 ? 'text-zinc-900' : 'text-brand-deep'}`}>{utilidad > 0 ? '+' : ''}{fmtH(utilidad)}</dd>
        </div>
      </dl>

      <h3 className="mt-10 text-base font-medium">Bloques registrados por día</h3>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {er.porDia.map((d) => (
          <div key={d.fecha} className="text-center">
            <div className="flex h-16 items-end overflow-hidden rounded-lg bg-zinc-200">
              <motion.div className="w-full rounded-lg bg-brand" initial={{ height: 0 }} animate={{ height: `${(d.bloques / 32) * 100}%` }} transition={{ duration: 0.5, ease }} />
            </div>
            <span className="mt-1.5 block text-xs text-zinc-500 first-letter:uppercase">{formatDay(d.fecha, { weekday: 'short' }).replace('.', '')}</span>
            <span className="tnum block text-xs text-zinc-400">{d.bloques}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
