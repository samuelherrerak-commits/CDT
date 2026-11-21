import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, Download, KeyRound, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { addDays, formatDay, toISO, weekDays, weekStart } from '../../lib/dates'
import { SLOTS, catById } from '../../lib/slots'
import { fmtDur, fmtHora, minutosDormidos } from '../../lib/sueno'
import { descargarCSV } from '../../lib/csv'
import EstadoResultados from '../EstadoResultados'
import Sheet from '../Sheet'
import SemanaNav from './SemanaNav'
import { ESTADOS, META_DIAS, plural, textoActividad } from './util'

const slotLabel = (id) => SLOTS.find((s) => s.id === id)?.label ?? id
const TABS = [['resultados', 'Resultados'], ['bitacora', 'Bitácora'], ['sueno', 'Sueño']]
const BLOQUES_COMPLETO = 24

/** Ficha individual: avance del curso día por día + resultados, bitácora y sueño del alumno. */
export default function AlumnoDetalle({ alumno, dia0, onBack }) {
  const hoy = toISO(new Date())
  const [dia, setDia] = useState(dia0)
  const [tab, setTab] = useState('resultados')
  const [registros, setRegistros] = useState(() => new Map())
  const [sueno, setSueno] = useState(() => new Map())
  const [perfil, setPerfil] = useState(alumno.perfil)
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const [pendiente, setPendiente] = useState(alumno.pendientePassword)
  const lunes = weekStart(dia)
  const est = ESTADOS[alumno.estado]

  // Se carga el curso completo una vez; las semanas se recortan en el navegador.
  const cargar = useCallback(async () => {
    try {
      const r = await api('admin_alumno', { email: alumno.email, desde: '2000-01-01', hasta: '2999-12-31' })
      setRegistros(new Map(r.data.map((x) => [`${x.fecha}|${x.hora}`, x])))
      setSueno(new Map(r.sueno.map((x) => [x.fecha, x])))
      setPerfil(r.perfil)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCargando(false)
    }
  }, [alumno.email])
  useEffect(() => { cargar() }, [cargar])

  const porDia = useMemo(() => {
    const m = {}
    registros.forEach((r) => { m[r.fecha] = (m[r.fecha] || 0) + 1 })
    return m
  }, [registros])

  // Tira del curso: desde el primer día con registro, 21 días como mínimo.
  const primero = alumno.primero || Object.keys(porDia).sort()[0]
  const celdas = useMemo(() => {
    if (!primero) return []
    const total = Math.min(42, Math.max(21, Math.round((new Date(hoy) - new Date(primero)) / 86400000) + 1))
    return Array.from({ length: total }, (_, i) => {
      const f = addDays(primero, i)
      const b = porDia[f] || 0
      return { f, b, n: i + 1, tipo: f > hoy ? 'futuro' : b >= BLOQUES_COMPLETO ? 'completo' : b > 0 ? 'parcial' : 'vacio' }
    })
  }, [primero, porDia, hoy])
  const completos = celdas.filter((c) => c.tipo === 'completo').length

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

  function exportar() {
    const filas = [...registros.values()].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      .map((r) => ({ ...r, categoria: catById(r.categoria)?.label ?? r.categoria }))
    descargarCSV(`${alumno.nombre.replace(/\s+/g, '-').toLowerCase()}-registros.csv`, [
      { key: 'fecha', label: 'Fecha' }, { key: 'hora', label: 'Hora (inicio del bloque)' }, { key: 'actividad', label: 'Actividad' }, { key: 'categoria', label: 'Categoría' },
    ], filas)
  }

  const diasSemana = weekDays(dia).filter((d) => d <= hoy)
  const noches = [...sueno.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const promNoche = noches.length ? Math.round(noches.reduce((t, x) => t + x.minutos, 0) / noches.length) : 0
  const habitual = perfil ? minutosDormidos(perfil.dormir, perfil.despertar) : 0

  return (
    <section>
      <button onClick={onBack} className="btn-press -ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200">
        <ArrowLeft className="size-4" /> Alumnos
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-medium xl:text-4xl">{alumno.nombre}</h2>
          <p className="mt-0.5 truncate text-sm text-zinc-500">{alumno.email}</p>
          <p className={`mt-2 flex items-center gap-2 text-sm ${est.tono}`}><span className={`size-2 rounded-full ${est.punto}`} />{textoActividad(alumno)}</p>
          {perfil && <p className="tnum mt-1 flex items-center gap-2 text-sm text-zinc-600"><Moon className="size-4 text-dusk" aria-hidden />Se acuesta {fmtHora(perfil.dormir)} · despierta {fmtHora(perfil.despertar)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportar} disabled={cargando} className="btn-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-900/15 hover:bg-zinc-200 disabled:opacity-60"><Download className="size-4" aria-hidden />Exportar CSV</button>
          <button onClick={() => setConfirmar(true)} disabled={pendiente} className="btn-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-900/15 hover:bg-zinc-200 disabled:opacity-60">
            <KeyRound className="size-4" aria-hidden />{pendiente ? 'Pendiente de nueva contraseña' : 'Restablecer contraseña'}
          </button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xl font-medium">Avance del curso</h3>
          <p className="tnum text-sm text-zinc-600">{plural(completos, 'día completo', 'días completos')} · meta {META_DIAS}</p>
        </div>
        {celdas.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{cargando ? 'Cargando…' : 'Todavía no registra nada.'}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-[repeat(21,minmax(0,1fr))]">
              {celdas.map((c) => (
                <button key={c.f} disabled={c.tipo === 'futuro'} onClick={() => { setDia(c.f); setTab('bitacora'); setAbierto(c.f) }}
                  title={`Día ${c.n} · ${formatDay(c.f, { day: 'numeric', month: 'short' })} · ${plural(c.b, 'bloque', 'bloques')}`}
                  aria-label={`Día ${c.n}, ${plural(c.b, 'bloque', 'bloques')}`}
                  className={`btn-press tnum grid aspect-square place-items-center rounded-lg text-xs ${c.tipo === 'completo' ? 'bg-brand font-medium text-white' : c.tipo === 'parcial' ? 'bg-brand-tint text-brand-deep' : c.tipo === 'vacio' ? 'bg-zinc-200 text-zinc-500' : 'text-zinc-300 ring-1 ring-zinc-900/10'}`}>
                  {c.n}
                </button>
              ))}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-brand" />Completo (24+ bloques)</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-brand-tint ring-1 ring-brand/30" />Parcial</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-zinc-200" />Sin registro</span>
              <span>Toca un día para ver lo que anotó.</span>
            </p>
          </>
        )}
      </div>

      <nav className="mt-12 flex items-center justify-between gap-3 border-b border-zinc-300" aria-label="Secciones de la ficha">
        <div className="flex gap-1">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k} className={`btn-press relative px-4 py-3 text-[15px] ${tab === k ? 'font-medium' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {label}
              {tab === k && <motion.span layoutId="ficha-tab" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} className="absolute inset-x-3 -bottom-px h-0.5 rounded bg-brand" />}
            </button>
          ))}
        </div>
        {tab !== 'sueno' && <SemanaNav lunes={lunes} esActual={weekStart(hoy) === lunes} onChange={setDia} />}
      </nav>

      <div className={`mt-8 transition-opacity ${cargando ? 'opacity-60' : ''}`}>
        {tab === 'resultados' && (
          <div className="max-w-2xl">
            <EstadoResultados dia={dia} setDia={setDia} registros={registros} sueno={sueno} sinCabecera />
          </div>
        )}

        {tab === 'bitacora' && (
          <ul className="max-w-3xl divide-y divide-zinc-300 border-y border-zinc-300">
            {diasSemana.length === 0 && <li className="py-6 text-sm text-zinc-500">Esta semana aún no empieza.</li>}
            {[...diasSemana].reverse().map((d) => {
              const lista = [...registros.values()].filter((r) => r.fecha === d).sort((a, b) => a.hora.localeCompare(b.hora))
              const s = sueno.get(d)
              const on = abierto === d
              return (
                <li key={d}>
                  <button onClick={() => setAbierto(on ? null : d)} aria-expanded={on} className="btn-press flex w-full items-center gap-3 py-4 text-left">
                    <span className="flex-1">
                      <span className="block font-medium capitalize">{formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      <span className="tnum text-sm text-zinc-500">{plural(lista.length, 'bloque registrado', 'bloques registrados')}{s ? ` · durmió ${fmtDur(s.minutos)}` : ''}</span>
                    </span>
                    <ChevronDown className={`size-4 text-zinc-400 transition-transform duration-200 ${on ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden pb-4">
                        {lista.length === 0 && <li className="py-2 text-sm text-zinc-500">No registró.</li>}
                        {lista.map((r) => (
                          <li key={r.hora} className="flex items-baseline gap-4 py-1.5 text-[15px]">
                            <span className="tnum w-36 shrink-0 text-xs text-zinc-500">{slotLabel(r.hora)}</span>
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
        )}

        {tab === 'sueno' && (
          <div className="max-w-3xl">
            <p className="tnum text-[15px] text-zinc-700">
              {noches.length === 0 ? 'Todavía no ha anotado su sueño.' : <>Promedio <b className="font-medium text-zinc-900">{fmtDur(promNoche)}</b> por noche, en {plural(noches.length, 'noche', 'noches')}.{habitual > 0 && <> Su horario habitual son {fmtDur(habitual)}.</>}</>}
            </p>
            {noches.length > 0 && (
              <table className="mt-5 w-full text-left text-[15px]">
                <thead><tr className="border-b border-zinc-900 text-xs text-zinc-500">
                  <th className="pb-2 font-medium">Despertó el</th><th className="pb-2 font-medium">Se durmió</th><th className="pb-2 font-medium">Despertó</th><th className="pb-2 text-right font-medium">Duración</th>
                </tr></thead>
                <tbody className="tnum divide-y divide-zinc-300">
                  {noches.map((x) => (
                    <tr key={x.fecha}>
                      <td className="py-3 capitalize">{formatDay(x.fecha, { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')}</td>
                      <td>{fmtHora(x.dormir)}</td><td>{fmtHora(x.despertar)}</td>
                      <td className="text-right">{fmtDur(x.minutos)}{habitual > 0 && Math.abs(x.minutos - habitual) >= 60 && <span className="ml-2 text-xs text-brand-deep">{x.minutos > habitual ? '+' : '−'}{fmtDur(Math.abs(x.minutos - habitual))}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
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
