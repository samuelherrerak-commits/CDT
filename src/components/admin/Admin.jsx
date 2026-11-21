import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, LayoutGrid, LogOut, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { addDays, toISO, weekStart } from '../../lib/dates'
import { bloquesEsperados } from '../../lib/resultados'
import AlumnoDetalle from './AlumnoDetalle'
import Alumnos from './Alumnos'
import Exportar from './Exportar'
import Resumen from './Resumen'
import SemanaNav from './SemanaNav'
import { estadoDe } from './util'

const ease = [0.23, 1, 0.32, 1]
const SECCIONES = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid, titulo: 'Resumen del grupo' },
  { id: 'alumnos', label: 'Alumnos', icon: Users, titulo: 'Alumnos' },
  { id: 'exportar', label: 'Exportar', icon: Download, titulo: 'Exportar datos' },
]

/** Panel del profesor: menú lateral en escritorio, pestañas arriba en pantallas chicas. */
export default function Admin({ session, onLogout, onMiRegistro }) {
  const hoy = toISO(new Date())
  const [dia, setDia] = useState(hoy)
  const [seccion, setSeccion] = useState('resumen')
  const [filtro, setFiltro] = useState('todos')
  const [sel, setSel] = useState(null)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const lunes = weekStart(dia)
  const domingo = addDays(lunes, 6)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api('admin_resumen', { desde: lunes, hasta: domingo, hoy })
      setDatos(r)
    } catch (e) {
      if (e.auth) { toast.error('Tu sesión expiró'); onLogout() } else toast.error(e.message === 'Sin permiso' ? 'Tu cuenta no tiene acceso de administrador' : e.message)
    } finally {
      setCargando(false)
    }
  }, [lunes, domingo, hoy, onLogout])
  useEffect(() => { cargar() }, [cargar])

  const esperados = bloquesEsperados(dia)
  const alumnos = useMemo(() => (datos?.alumnos ?? []).map((a) => {
    const e = estadoDe(a, hoy)
    return { ...a, ...e, cumpl: esperados ? Math.min(100, Math.round((a.bloques / esperados) * 100)) : 0 }
  }), [datos, esperados, hoy])

  const abrir = (a) => { setSel(a); setSeccion('alumnos') }
  const actual = SECCIONES.find((s) => s.id === seccion)
  const usaSemana = !sel && seccion !== 'exportar'

  const irA = (id) => { setSel(null); setSeccion(id) }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="border-b border-zinc-300 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r lg:bg-zinc-200/40">
        <div className="flex h-full flex-col px-5 py-3 lg:px-6 lg:py-7">
          <div className="flex items-center justify-between lg:block">
            <img src="/logo-mth.png" alt="MTH · Medición y Talento Humano" width="150" height="83" className="-ml-1.5 h-[60px] w-auto lg:h-[84px]" />
            <div className="flex items-center gap-1 lg:hidden">
              <button onClick={onMiRegistro} className="btn-press rounded-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200">Mi registro</button>
              <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200"><LogOut className="size-4" /></button>
            </div>
          </div>
          <p className="mt-5 hidden text-sm font-medium text-zinc-500 lg:block">Panel del profesor</p>

          <nav aria-label="Panel" className="-mx-1 mt-2 flex gap-1 overflow-x-auto lg:mt-3 lg:flex-col lg:overflow-visible">
            {SECCIONES.map(({ id, label, icon: Icon }) => {
              const on = seccion === id
              return (
                <button key={id} onClick={() => irA(id)} aria-current={on ? 'page' : undefined} className={`btn-press relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${on ? 'font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}>
                  {on && <motion.span layoutId="admin-nav" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} className="absolute inset-0 rounded-xl bg-zinc-50 shadow-[0_0_0_1px_rgb(26_26_26/0.08)]" />}
                  <Icon className="relative size-[18px]" aria-hidden /><span className="relative">{label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto hidden lg:block">
            <p className="truncate text-xs text-zinc-500">{session.email}</p>
            <button onClick={onMiRegistro} className="btn-press mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-zinc-600 hover:bg-zinc-200"><UserRound className="size-[18px]" aria-hidden />Mi registro</button>
            <button onClick={onLogout} className="btn-press flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-zinc-600 hover:bg-zinc-200"><LogOut className="size-[18px]" aria-hidden />Cerrar sesión</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-5 pb-24 pt-7 sm:px-8 lg:px-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          {!sel && (
            <header className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-3xl font-medium sm:text-4xl">{actual.titulo}</h1>
              {usaSemana && <SemanaNav lunes={lunes} esActual={weekStart(hoy) === lunes} onChange={setDia} />}
            </header>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={sel ? `a-${sel.email}` : seccion} className={sel ? '' : 'mt-8'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease }}>
              {sel ? (
                <AlumnoDetalle alumno={alumnos.find((a) => a.email === sel.email) ?? sel} dia0={dia} onBack={() => { setSel(null); cargar() }} />
              ) : seccion === 'exportar' ? (
                <Exportar lunes={lunes} domingo={domingo} />
              ) : !datos ? (
                <p className="text-sm text-zinc-500">{cargando ? 'Cargando…' : 'No se pudieron cargar los datos.'}</p>
              ) : (
                <div className={`transition-opacity ${cargando ? 'opacity-60' : ''}`}>
                  {seccion === 'resumen'
                    ? <Resumen alumnos={alumnos} porDia={datos.porDia ?? {}} lunes={lunes} hoy={hoy} onAbrir={abrir} onVerTodos={() => { setFiltro('atencion'); irA('alumnos') }} />
                    : <Alumnos key={filtro} alumnos={alumnos} onAbrir={abrir} filtroInicial={filtro} />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
