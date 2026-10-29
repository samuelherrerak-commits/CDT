import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, LogOut, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { addDays, formatDay, fromISO, toISO, weekStart } from '../../lib/dates'
import { CATEGORIAS, SUENO, catById } from '../../lib/slots'
import { bloquesEsperados } from '../../lib/resultados'
import { descargarCSV } from '../../lib/csv'
import AlumnoDetalle from './AlumnoDetalle'

const ease = [0.23, 1, 0.32, 1]
const fmtH = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`
const diasDesde = (iso, hoy) => Math.round((fromISO(hoy) - fromISO(iso)) / 86400000)

const ORDENES = {
  atencion: { label: 'Necesitan atención primero', fn: (a, b) => a.cumpl - b.cumpl || a.nombre.localeCompare(b.nombre) },
  nombre: { label: 'Nombre', fn: (a, b) => a.nombre.localeCompare(b.nombre) },
  actividad: { label: 'Última actividad', fn: (a, b) => (b.ultimo || '').localeCompare(a.ultimo || '') },
}

/** Panel del profesor: cómo va el grupo esta semana y quién necesita atención. */
export default function Admin({ session, onLogout, onMiRegistro }) {
  const hoy = toISO(new Date())
  const [dia, setDia] = useState(hoy)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [q, setQ] = useState('')
  const [orden, setOrden] = useState('atencion')
  const [sel, setSel] = useState(null)
  const [exportando, setExportando] = useState(false)
  const lunes = weekStart(dia)
  const domingo = addDays(lunes, 6)
  const esActual = weekStart(hoy) === lunes

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api('admin_resumen', { desde: lunes, hasta: domingo, hoy })
      setDatos(r.alumnos)
    } catch (e) {
      if (e.auth) { toast.error('Tu sesión expiró'); onLogout() } else toast.error(e.message === 'Sin permiso' ? 'Tu cuenta no tiene acceso de administrador' : e.message)
    } finally {
      setCargando(false)
    }
  }, [lunes, domingo, hoy, onLogout])
  useEffect(() => { cargar() }, [cargar])

  const esperados = bloquesEsperados(dia)
  const alumnos = useMemo(() => (datos ?? []).map((a) => ({
    ...a,
    cumpl: esperados ? Math.min(100, Math.round((a.bloques / esperados) * 100)) : 0,
    sinActividad: a.ultimo ? diasDesde(a.ultimo, hoy) : null,
  })), [datos, esperados, hoy])

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return alumnos.filter((a) => !t || a.nombre.toLowerCase().includes(t) || a.email.includes(t)).sort(ORDENES[orden].fn)
  }, [alumnos, q, orden])

  const n = alumnos.length
  const conRegistroHoy = alumnos.filter((a) => a.bloquesHoy > 0).length
  const enRiesgo = alumnos.filter((a) => a.sinActividad === null || a.sinActividad >= 2).length
  const promedio = (key) => (n ? alumnos.reduce((t, a) => t + (key === 'sueno' ? a.suenoMin / 60 : a.porCat[key] * 0.5), 0) / n : 0)
  const filasGrupo = [
    ...CATEGORIAS.map((c) => ({ key: c.id, label: c.label, dot: c.dot, h: promedio(c.id) })),
    { key: 'sueno', label: SUENO.label, dot: SUENO.dot, h: promedio('sueno') },
  ]
  const maxH = Math.max(...filasGrupo.map((f) => f.h), 1)

  async function exportar(todo, tipo) {
    setExportando(true)
    try {
      const desde = todo ? '2000-01-01' : lunes
      const hasta = todo ? '2999-12-31' : domingo
      const r = await api('admin_exportar', { desde, hasta })
      const sufijo = todo ? 'curso-completo' : lunes
      if (tipo === 'registros') {
        descargarCSV(`registros-${sufijo}.csv`, [
          { key: 'nombre', label: 'Alumno' }, { key: 'email', label: 'Correo' }, { key: 'fecha', label: 'Fecha' },
          { key: 'hora', label: 'Hora (inicio del bloque)' }, { key: 'actividad', label: 'Actividad' }, { key: 'categoria', label: 'Categoría' },
        ], r.registros.map((x) => ({ ...x, categoria: catById(x.categoria)?.label ?? x.categoria })))
      } else {
        descargarCSV(`sueno-${sufijo}.csv`, [
          { key: 'nombre', label: 'Alumno' }, { key: 'email', label: 'Correo' }, { key: 'fecha', label: 'Fecha (despertó)' },
          { key: 'dormir', label: 'Se durmió' }, { key: 'despertar', label: 'Despertó' }, { key: 'minutos', label: 'Minutos' },
        ], r.sueno)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-5 pb-20 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center justify-between">
        <img src="/logo-mth.png" alt="MTH · Medición y Talento Humano" width="108" height="60" className="-ml-1.5 h-[60px] w-auto" />
        <div className="flex items-center gap-1">
          <button onClick={onMiRegistro} className="btn-press rounded-full px-3.5 py-2 text-sm text-zinc-600 hover:bg-zinc-200">Mi registro</button>
          <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200"><LogOut className="size-4" /></button>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {sel ? (
          <motion.div key="detalle" className="mt-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
            <AlumnoDetalle alumno={sel} dia0={dia} onBack={() => { setSel(null); cargar() }} />
          </motion.div>
        ) : (
          <motion.div key="grupo" className="mt-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-medium sm:text-4xl">Panel del grupo</h1>
                <p className="mt-1 text-sm text-zinc-500">Semana del {formatDay(lunes, { day: 'numeric', month: 'long' })} al {formatDay(domingo, { day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="flex gap-1">
                <button aria-label="Semana anterior" onClick={() => setDia(addDays(lunes, -7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200"><ChevronLeft className="size-4" /></button>
                <button aria-label="Semana siguiente" disabled={esActual} onClick={() => setDia(addDays(lunes, 7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ChevronRight className="size-4" /></button>
              </div>
            </div>

            <div className={`mt-8 grid gap-10 lg:grid-cols-[1fr_1.15fr] ${cargando ? 'opacity-60' : ''} transition-opacity`}>
              <div className="min-w-0">
                <p className="text-[17px] leading-relaxed text-zinc-700 text-pretty tnum">
                  <b className="font-medium text-zinc-900">{n}</b> alumnos · <b className="font-medium text-zinc-900">{conRegistroHoy}</b> registraron hoy
                  {enRiesgo > 0 && <> · <b className="font-medium text-brand-deep">{enRiesgo}</b> sin actividad en 2 días o más</>}
                </p>
                <h2 className="mt-8 text-xl font-medium">Promedio por alumno esta semana</h2>
                <dl className="mt-3">
                  {filasGrupo.map((f, i) => (
                    <div key={f.key} className="border-b border-zinc-300 py-3">
                      <div className="flex items-baseline justify-between text-[15px]">
                        <dt className="flex items-center gap-2.5"><span className={`size-2 rounded-full ${f.dot}`} />{f.label}</dt>
                        <dd className="tnum">{fmtH(f.h)}</dd>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200">
                        <motion.div key={`${lunes}-${f.key}-${n}`} className={`h-full rounded-full ${f.dot}`} initial={{ width: 0 }} animate={{ width: `${(f.h / maxH) * 100}%` }} transition={{ duration: 0.6, ease, delay: i * 0.05 }} />
                      </div>
                    </div>
                  ))}
                </dl>
                <details className="mt-8">
                  <summary className="btn-press flex w-fit cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 ring-zinc-900/15 hover:bg-zinc-200"><Download className="size-4" aria-hidden />Exportar CSV</summary>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {[['Registros de la semana', false, 'registros'], ['Registros de todo el curso', true, 'registros'], ['Sueño de la semana', false, 'sueno'], ['Sueño de todo el curso', true, 'sueno']].map(([t, todo, tipo]) => (
                      <button key={t} disabled={exportando} onClick={() => exportar(todo, tipo)} className="btn-press rounded-xl bg-zinc-50 px-4 py-3 text-left ring-1 ring-zinc-900/10 hover:bg-zinc-200 disabled:opacity-60">{t}</button>
                    ))}
                  </div>
                </details>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative min-w-[12rem] flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno" aria-label="Buscar alumno" className="w-full rounded-xl bg-zinc-200/70 py-3 pl-10 pr-3 text-[16px] outline-none ring-1 ring-transparent transition-shadow placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-brand" />
                  </label>
                  <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar" className="max-w-full rounded-xl bg-zinc-200/70 px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-brand">
                    {Object.entries(ORDENES).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
                  </select>
                </div>

                <ul className="mt-3 divide-y divide-zinc-300">
                  {datos && visibles.length === 0 && <li className="py-6 text-sm text-zinc-500">{n === 0 ? 'Aún no hay alumnos registrados.' : 'Ningún alumno coincide con la búsqueda.'}</li>}
                  {visibles.map((a) => {
                    const riesgo = a.sinActividad === null || a.sinActividad >= 2
                    return (
                      <li key={a.email}>
                        <button onClick={() => setSel(a)} className="btn-press group flex w-full items-center gap-4 py-3.5 text-left">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-200 text-zinc-500"><UserRound className="size-5" aria-hidden /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-medium">{a.nombre}</span>
                              {a.pendientePassword && <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-deep">Nueva contraseña pendiente</span>}
                            </span>
                            <span className={`tnum block truncate text-sm ${riesgo ? 'text-brand-deep' : 'text-zinc-500'}`}>
                              {a.ultimo ? (a.sinActividad === 0 ? 'Registró hoy' : `Última actividad hace ${a.sinActividad} ${a.sinActividad === 1 ? 'día' : 'días'}`) : 'Sin registros todavía'}
                              <span className="text-zinc-400"> · {a.diasCompletos} {a.diasCompletos === 1 ? 'día completo' : 'días completos'}</span>
                            </span>
                          </span>
                          <span className="w-24 shrink-0 text-right">
                            <span className="tnum text-[15px] font-medium">{a.cumpl}%</span>
                            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-zinc-200"><span className="block h-full rounded-full bg-brand" style={{ width: `${a.cumpl}%` }} /></span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500 text-pretty">El % es lo registrado esta semana frente a los bloques que ya pasaron. Un día completo tiene 24 o más de 32 bloques registrados.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
