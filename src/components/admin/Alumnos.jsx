import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { fmtDur } from '../../lib/sueno'
import { ESTADOS, META_DIAS, textoActividad } from './util'

const FILTROS = [
  ['todos', 'Todos', () => true],
  ['atencion', 'Necesitan atención', (a) => a.estado !== 'aldia'],
  ['aldia', 'Al día', (a) => a.estado === 'aldia'],
  ['pendiente', 'Contraseña por recrear', (a) => a.pendientePassword],
]

const COLUMNAS = [
  { key: 'nombre', label: 'Alumno', cmp: (a, b) => a.nombre.localeCompare(b.nombre) },
  { key: 'estado', label: 'Actividad', cmp: (a, b) => (b.sinActividad ?? 999) - (a.sinActividad ?? 999) },
  { key: 'hoy', label: 'Hoy', cmp: (a, b) => a.bloquesHoy - b.bloquesHoy },
  { key: 'cumpl', label: 'Semana', cmp: (a, b) => a.cumpl - b.cumpl },
  { key: 'completos', label: 'Días completos', cmp: (a, b) => a.diasCompletos - b.diasCompletos },
  { key: 'sueno', label: 'Sueño prom.', cmp: (a, b) => (a.suenoDias ? a.suenoMin / a.suenoDias : 0) - (b.suenoDias ? b.suenoMin / b.suenoDias : 0) },
]
const GRID = 'md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_4rem_8rem_7.5rem_6.5rem] md:items-center md:gap-5'

export default function Alumnos({ alumnos, onAbrir, filtroInicial = 'todos' }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState(filtroInicial)
  const [orden, setOrden] = useState({ key: 'cumpl', dir: 1 })

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    const f = FILTROS.find(([k]) => k === filtro)[2]
    const col = COLUMNAS.find((c) => c.key === orden.key)
    return alumnos.filter((a) => f(a) && (!t || a.nombre.toLowerCase().includes(t) || a.email.includes(t))).sort((a, b) => col.cmp(a, b) * orden.dir || a.nombre.localeCompare(b.nombre))
  }, [alumnos, q, filtro, orden])

  const ordenar = (key) => setOrden((o) => (o.key === key ? { key, dir: -o.dir } : { key, dir: 1 }))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar alumno" className="w-full rounded-xl bg-zinc-200/70 py-3 pl-10 pr-3 text-[16px] outline-none ring-1 ring-transparent transition-shadow placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-brand" />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
          {FILTROS.map(([k, label, fn]) => (
            <button key={k} onClick={() => setFiltro(k)} aria-pressed={filtro === k} className={`btn-press rounded-full px-3.5 py-2 text-sm ${filtro === k ? 'bg-zinc-900 text-zinc-50' : 'text-zinc-600 ring-1 ring-zinc-900/15 hover:bg-zinc-200'}`}>
              {label} <span className="tnum opacity-60">{alumnos.filter(fn).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-6 hidden border-b border-zinc-900 pb-2 text-xs text-zinc-500 ${GRID}`} role="row">
        {COLUMNAS.map((c) => (
          <button key={c.key} onClick={() => ordenar(c.key)} className={`flex items-center gap-1 text-left font-medium hover:text-zinc-900 ${orden.key === c.key ? 'text-zinc-900' : ''}`}>
            {c.label}
            {orden.key === c.key && (orden.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
          </button>
        ))}
      </div>

      <ul className="mt-2 divide-y divide-zinc-300 md:mt-0">
        {visibles.length === 0 && <li className="py-8 text-sm text-zinc-500">{alumnos.length === 0 ? 'Aún no hay alumnos registrados.' : 'Ningún alumno coincide con la búsqueda.'}</li>}
        {visibles.map((a) => {
          const est = ESTADOS[a.estado]
          const sueno = a.suenoDias ? fmtDur(Math.round(a.suenoMin / a.suenoDias)) : '–'
          return (
            <li key={a.email}>
              <button onClick={() => onAbrir(a)} className={`btn-press group w-full py-3.5 text-left ${GRID}`}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${est.punto}`} aria-label={est.label} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:underline group-hover:underline-offset-4">{a.nombre}</span>
                    <span className="block truncate text-xs text-zinc-500">{a.email}{a.pendientePassword && <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-deep">Contraseña por recrear</span>}</span>
                  </span>
                </span>
                <span className={`mt-1 block truncate text-sm md:mt-0 ${est.tono}`}>{textoActividad(a)}</span>
                <span className="tnum hidden text-sm md:block">{a.bloquesHoy}</span>
                <span className="mt-2 flex items-center gap-2.5 md:mt-0">
                  <span className="tnum w-10 text-sm font-medium">{a.cumpl}%</span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200"><span className="block h-full rounded-full bg-brand" style={{ width: `${a.cumpl}%` }} /></span>
                </span>
                <span className="tnum mt-1 block text-sm text-zinc-600 md:mt-0">{a.diasCompletos} <span className="text-zinc-400">/ {META_DIAS}</span></span>
                <span className="tnum hidden text-sm text-zinc-600 md:block">{sueno}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-5 max-w-2xl text-xs leading-relaxed text-zinc-500 text-pretty">Semana: lo registrado frente a los bloques despiertos que ya pasaron (supone unas 8 h de sueño). Día completo: 24 o más bloques registrados. Toca un alumno para ver su ficha.</p>
    </div>
  )
}
