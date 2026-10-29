import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, KeyRound, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { addDays, formatDay, toISO, weekDays, weekStart } from '../../lib/dates'
import { SLOTS, catById } from '../../lib/slots'
import { fmtDur, fmtHora } from '../../lib/sueno'
import EstadoResultados from '../EstadoResultados'
import Sheet from '../Sheet'

const slotLabel = (id) => SLOTS.find((s) => s.id === id)?.label ?? id

/** Lo mismo que ve el alumno, en solo lectura: estado de resultados de la semana + lo que anotó cada día. */
export default function AlumnoDetalle({ alumno, dia0, onBack }) {
  const [dia, setDia] = useState(dia0)
  const [registros, setRegistros] = useState(() => new Map())
  const [sueno, setSueno] = useState(() => new Map())
  const [perfil, setPerfil] = useState(alumno.perfil)
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const [pendiente, setPendiente] = useState(alumno.pendientePassword)
  const lunes = weekStart(dia)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api('admin_alumno', { email: alumno.email, desde: lunes, hasta: addDays(lunes, 6) })
      setRegistros(new Map(r.data.map((x) => [`${x.fecha}|${x.hora}`, x])))
      setSueno(new Map(r.sueno.map((x) => [x.fecha, x])))
      setPerfil(r.perfil)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCargando(false)
    }
  }, [alumno.email, lunes])
  useEffect(() => { cargar() }, [cargar])

  async function restablecer() {
    try {
      await api('admin_reset', { email: alumno.email })
      setPendiente(true)
      setConfirmar(false)
      toast.success('Listo: creará una contraseña nueva al entrar')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const hoy = toISO(new Date())
  const dias = weekDays(dia).filter((d) => d <= hoy)

  return (
    <section>
      <button onClick={onBack} className="btn-press -ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200">
        <ArrowLeft className="size-4" /> Todos los alumnos
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-medium">{alumno.nombre}</h2>
          <p className="mt-0.5 truncate text-sm text-zinc-500">{alumno.email}</p>
          {perfil && <p className="tnum mt-2 flex items-center gap-2 text-sm text-zinc-600"><Moon className="size-4 text-dusk" aria-hidden />Se acuesta {fmtHora(perfil.dormir)} · despierta {fmtHora(perfil.despertar)}</p>}
        </div>
        <button onClick={() => setConfirmar(true)} disabled={pendiente} className="btn-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-900/15 hover:bg-zinc-200 disabled:opacity-60">
          <KeyRound className="size-4" aria-hidden />
          {pendiente ? 'Pendiente de nueva contraseña' : 'Restablecer contraseña'}
        </button>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <div className={`min-w-0 transition-opacity ${cargando ? 'opacity-60' : ''}`}>
          <EstadoResultados dia={dia} setDia={setDia} registros={registros} sueno={sueno} />
        </div>

        <div className="min-w-0">
          <h3 className="text-2xl font-medium">Lo que anotó</h3>
          <ul className="mt-4 divide-y divide-zinc-300">
            {dias.length === 0 && <li className="py-4 text-sm text-zinc-500">Esta semana aún no empieza.</li>}
            {[...dias].reverse().map((d) => {
              const lista = [...registros.values()].filter((r) => r.fecha === d).sort((a, b) => a.hora.localeCompare(b.hora))
              const s = sueno.get(d)
              const on = abierto === d
              return (
                <li key={d}>
                  <button onClick={() => setAbierto(on ? null : d)} aria-expanded={on} className="btn-press flex w-full items-center gap-3 py-3.5 text-left">
                    <span className="flex-1">
                      <span className="block font-medium capitalize">{formatDay(d, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                      <span className="tnum text-sm text-zinc-500">{lista.length} de 32 bloques{s ? ` · durmió ${fmtDur(s.minutos)}` : ''}</span>
                    </span>
                    <ChevronDown className={`size-4 text-zinc-400 transition-transform duration-200 ${on ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden pb-3">
                        {lista.length === 0 && <li className="py-2 text-sm text-zinc-500">No registró.</li>}
                        {lista.map((r) => (
                          <li key={r.hora} className="flex items-baseline gap-3 py-1.5 text-sm">
                            <span className="tnum w-[8.5rem] shrink-0 text-xs text-zinc-500">{slotLabel(r.hora)}</span>
                            <span className={`size-2 shrink-0 translate-y-px rounded-full ${catById(r.categoria)?.dot ?? 'bg-zinc-300'}`} title={catById(r.categoria)?.label} />
                            <span className="min-w-0 break-words">{r.actividad}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {confirmar && (
          <Sheet label="Restablecer contraseña" onClose={() => setConfirmar(false)} onSubmit={(e) => { e.preventDefault(); restablecer() }}>
            <div>
              <h2 className="text-2xl font-medium">¿Restablecer la contraseña de {alumno.nombre.split(' ')[0]}?</h2>
              <p className="mt-2 text-sm text-zinc-600 text-pretty">La contraseña actual se borra. Al intentar entrar, la app le pedirá crear una nueva con el código de acceso del curso. Su historial se conserva.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmar(false)} className="btn-press h-12 rounded-xl px-4 text-zinc-600 hover:bg-zinc-200">Cancelar</button>
              <button className="btn-press h-12 flex-1 rounded-xl bg-brand-deep font-medium text-white">Sí, restablecer</button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </section>
  )
}
