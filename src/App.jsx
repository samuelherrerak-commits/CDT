import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { LogOut, Moon, Plus } from 'lucide-react'
import { api, clearSession, getSession, readCache, writeCache, readLocal, writeLocal } from './lib/api'
import { toMin, minutosDormidos } from './lib/sueno'
import { addDays, formatDay, toISO, weekStart } from './lib/dates'
import { currentSlot, SLOTS } from './lib/slots'
import { useTimeNotifier } from './hooks/useTimeNotifier'
import { useNowMinutes } from './hooks/useNow'
import Login from './components/Login'
import DayView, { pendientesDeHoy } from './components/DayView'
import ReminderBanner from './components/ReminderBanner'
import SuenoSheet from './components/SuenoSheet'
import PerfilSueno from './components/PerfilSueno'
import Editor from './components/Editor'
import EstadoResultados from './components/EstadoResultados'

const keyOf = (r) => `${r.fecha}|${r.hora}`
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
// Abierta desde el ícono de inicio (o desde un aviso): ir directo a registrar.
const PARAMS = new URLSearchParams(location.search)
const ABRIR_DIRECTO = standalone() || PARAMS.has('registrar')
const ABRIR_SUENO = PARAMS.has('sueno') // aviso de "buenos días"
const OMITIR_KEY = 'ct:sueno-omitido'

const TABS = [
  { id: 'dia', label: 'Registro' },
  { id: 'semana', label: 'Estado de resultados' },
]

export default function App() {
  const [session, setSession] = useState(getSession)
  return (
    <>
      {session ? <Portal session={session} onLogout={() => { clearSession(); setSession(null) }} /> : <Login onLogin={setSession} />}
      <Toaster position="top-center" theme="light" toastOptions={{ className: '!rounded-2xl !font-sans' }} />
    </>
  )
}

function Portal({ session, onLogout }) {
  const [tab, setTab] = useState('dia')
  const [dia, setDia] = useState(() => toISO(new Date()))
  // Se pinta al instante con lo último guardado en el teléfono y se sincroniza con la hoja después.
  const [registros, setRegistros] = useState(() => {
    const cache = readCache(session.email)
    return new Map(cache.map((r) => [keyOf(r), r]))
  }) // "fecha|hora" -> registro
  const [listo, setListo] = useState(() => readCache(session.email).length > 0)
  const [sueno, setSueno] = useState(() => new Map(readLocal(`ct:sueno:${session.email}`, []).map((r) => [r.fecha, r]))) // fecha -> sueño
  const [perfil, setPerfil] = useState(() => readLocal(`ct:perfil:${session.email}`, null)) // { dormir, despertar }
  const [sync, setSync] = useState(false) // ya habló el servidor
  const [sinRed, setSinRed] = useState(false)
  const [suenoManual, setSuenoManual] = useState(null) // fecha que se edita a mano
  const [perfilManual, setPerfilManual] = useState(false)
  const [omitido, setOmitido] = useState(() => readLocal(OMITIR_KEY, ''))
  const [editando, setEditando] = useState(null) // slot
  const semana = weekStart(dia)
  const minutosAhora = useNowMinutes()

  const cargar = useCallback(async () => {
    try {
      const { data, sueno: sn, perfil: pf } = await api('registros', { desde: semana, hasta: addDays(semana, 6) })
      const fin = addDays(semana, 6)
      if (sn) setSueno((prev) => {
        const next = new Map([...prev].filter(([f]) => f < semana || f > fin))
        sn.forEach((r) => next.set(r.fecha, r))
        return next
      })
      if (pf !== undefined) setPerfil(pf)
      setSync(true)
      setRegistros((prev) => {
        const next = new Map([...prev].filter(([, r]) => r.fecha < semana || r.fecha > addDays(semana, 6)))
        data.forEach((r) => next.set(keyOf(r), r))
        return next
      })
      setListo(true)
    } catch (e) {
      setListo(true) // sin red: seguimos con lo guardado en el teléfono
      setSinRed(true)
      if (e.auth) { toast.error('Tu sesión expiró, entra de nuevo'); onLogout() } else toast.error(e.message)
    }
  }, [semana, onLogout])

  useEffect(() => { cargar() }, [cargar])

  const registrosRef = useRef(registros)
  registrosRef.current = registros
  useEffect(() => { // guarda solo los últimos 14 días
    const limite = addDays(toISO(new Date()), -14)
    writeCache(session.email, [...registros.values()].filter((r) => r.fecha >= limite))
  }, [registros, session.email])

  const suenoRef = useRef(sueno)
  suenoRef.current = sueno
  useEffect(() => {
    const limite = addDays(toISO(new Date()), -14)
    writeLocal(`ct:sueno:${session.email}`, [...sueno.values()].filter((r) => r.fecha >= limite))
  }, [sueno, session.email])
  useEffect(() => { writeLocal(`ct:perfil:${session.email}`, perfil) }, [perfil, session.email])

  // Abre el registro del bloque indicado, o del pendiente más antiguo de hoy.
  const abrirSlot = useCallback((id) => {
    const hoy = toISO(new Date())
    const ahora = new Date().getHours() * 60 + new Date().getMinutes()
    setDia(hoy)
    setTab('dia')
    const despierta = suenoRef.current.get(hoy) ? toMin(suenoRef.current.get(hoy).despertar) : 0
    const slot = SLOTS.find((s) => s.id === id) ?? pendientesDeHoy(registrosRef.current, hoy, ahora, despierta)[0] ?? currentSlot()
    if (slot) setEditando(slot)
  }, [])

  // ¿Hay que preguntar por el sueño? Primero se pide el horario habitual (cuenta nueva) y luego "¿cuánto dormiste?" una vez al día.
  const hoyISO = toISO(new Date())
  const suenoHoy = sueno.get(hoyISO)
  const despertarMin = suenoHoy ? toMin(suenoHoy.despertar) : 0
  const decidido = sync || (sinRed && !!perfil) || (!!perfil && (!!suenoHoy || omitido === hoyISO || minutosAhora < 240))
  const mostrarPerfil = (sync && !perfil) || perfilManual
  const mostrarSuenoAuto = !!perfil && decidido && minutosAhora >= 240 && !suenoHoy && omitido !== hoyISO
  const suenoDia = suenoManual ?? (mostrarSuenoAuto ? hoyISO : null)

  // Al abrir desde el ícono: sueño (si falta) y luego directo al registro, una sola vez.
  const abierto = useRef(false)
  useEffect(() => {
    if (!listo || !decidido || abierto.current || !(ABRIR_DIRECTO || ABRIR_SUENO)) return
    if (mostrarPerfil || suenoDia) return // primero se responde esa pregunta
    abierto.current = true
    if (location.search) history.replaceState(null, '', location.pathname)
    if (ABRIR_SUENO) setSuenoManual(hoyISO)
    else abrirSlot()
  }, [listo, decidido, mostrarPerfil, suenoDia, hoyISO, abrirSlot])

  // Al volver a la app (otro día, o tras estar en segundo plano): hoy + datos frescos.
  const ultimoDia = useRef(toISO(new Date()))
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const hoy = toISO(new Date())
      if (hoy !== ultimoDia.current) { ultimoDia.current = hoy; setDia(hoy) }
      cargar()
    }
    const onSw = (e) => {
      if (e.data?.type !== 'registrar') return
      if (e.data.kind === 'despertar') setSuenoManual(toISO(new Date()))
      else abrirSlot()
    }
    document.addEventListener('visibilitychange', onVisible)
    navigator.serviceWorker?.addEventListener('message', onSw)
    return () => { document.removeEventListener('visibilitychange', onVisible); navigator.serviceWorker?.removeEventListener('message', onSw) }
  }, [cargar, abrirSlot])

  const esHoy = dia === hoyISO
  const pendientes = pendientesDeHoy(registros, hoyISO, minutosAhora, despertarMin)

  const { permission, requestPermission } = useTimeNotifier({
    enabled: true,
    needsReminder: (id) => !registrosRef.current.has(`${toISO(new Date())}|${id}`),
    onOpen: abrirSlot,
    onWake: () => setSuenoManual(toISO(new Date())),
    perfil,
  })

  async function guardar(slot, { actividad, categoria }) {
    const key = `${dia}|${slot.id}`
    const previo = registros.get(key)
    setRegistros((m) => new Map(m).set(key, { fecha: dia, hora: slot.id, actividad, categoria })) // optimista
    setEditando(null)
    try {
      await api('guardar', { fecha: dia, hora: slot.id, actividad, categoria })
      toast.success('Media hora registrada')
    } catch (e) {
      setRegistros((m) => { const n = new Map(m); previo ? n.set(key, previo) : n.delete(key); return n })
      toast.error(e.message)
    }
  }

  async function guardarSueno(fecha, { dormir, despertar }) {
    const previo = sueno.get(fecha)
    const minutos = minutosDormidos(dormir, despertar)
    setSueno((m) => new Map(m).set(fecha, { fecha, dormir, despertar, minutos })) // optimista
    setSuenoManual(null)
    try {
      await api('sueno', { fecha, dormir, despertar })
      toast.success('Sueño registrado')
    } catch (e) {
      setSueno((m) => { const n = new Map(m); previo ? n.set(fecha, previo) : n.delete(fecha); return n })
      toast.error(e.message)
    }
  }

  function omitirSueno() {
    setSuenoManual(null)
    if (!sueno.has(hoyISO)) { writeLocal(OMITIR_KEY, hoyISO); setOmitido(hoyISO) } // no insistir más hoy
  }

  async function guardarPerfil(p) {
    try {
      await api('perfil', p)
      setPerfil(p)
      setPerfilManual(false)
      toast.success('Horario guardado')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function borrar(slot) {
    const key = `${dia}|${slot.id}`
    const previo = registros.get(key)
    setRegistros((m) => { const n = new Map(m); n.delete(key); return n })
    setEditando(null)
    try {
      await api('eliminar', { fecha: dia, hora: slot.id })
    } catch (e) {
      setRegistros((m) => new Map(m).set(key, previo))
      toast.error(e.message)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-5 pb-36 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <img src="/logo-mth.png" alt="MTH · Medición y Talento Humano" width="108" height="60" className="-ml-1.5 h-[60px] w-auto" />
        <div className="flex items-center gap-1">
          <span className="text-sm text-zinc-500">Hola, <span className="font-medium text-zinc-900">{session.name.split(' ')[0]}</span></span>
          <IconBtn label="Horario de sueño" onClick={() => setPerfilManual(true)}><Moon className="size-4" /></IconBtn>
          <IconBtn label="Cerrar sesión" onClick={onLogout}><LogOut className="size-4" /></IconBtn>
        </div>
      </header>

      <ReminderBanner permission={permission} onEnable={requestPermission} />

      <nav className="relative mt-4 flex rounded-full bg-zinc-200 p-1" aria-label="Secciones">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id} className="btn-press relative flex-1 rounded-full py-2 text-sm font-medium">
            {tab === t.id && <motion.span layoutId="tab" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} className="absolute inset-0 rounded-full bg-zinc-50 shadow-[0_1px_2px_rgb(26_26_26/0.08)]" />}
            <span className={`relative ${tab === t.id ? '' : 'text-zinc-500'}`}>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>
            {tab === 'dia'
              ? <DayView dia={dia} setDia={setDia} registros={registros} onPick={setEditando} minutosAhora={minutosAhora} sueno={sueno.get(dia)} onSueno={() => setSuenoManual(dia)} despertarMin={dia === hoyISO ? despertarMin : 0} />
              : <EstadoResultados dia={dia} setDia={setDia} registros={registros} sueno={sueno} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {tab === 'dia' && esHoy && pendientes.length > 0 && !editando && !suenoDia && !mostrarPerfil && (
          <motion.div
            key="cta"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
            className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-zinc-100 via-zinc-100/90 to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8"
          >
            <button onClick={() => setEditando(pendientes[0])} className="btn-press mx-auto flex h-16 w-full max-w-xl items-center justify-center gap-3 rounded-2xl bg-brand-deep text-base font-medium text-white shadow-[0_8px_24px_rgb(197_54_15/0.28)]">
              <Plus className="size-5" />
              <span>Registrar <span className="tabular-nums">{pendientes[0].label.split(' – ')[0]}</span></span>
              {pendientes.length > 1 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums">+{pendientes.length - 1}</span>}
            </button>
          </motion.div>
        )}
        {mostrarPerfil && (
          <PerfilSueno key="perfil" inicial={perfil} onSave={guardarPerfil} onClose={perfilManual ? () => setPerfilManual(false) : undefined} />
        )}
        {!mostrarPerfil && suenoDia && (
          <SuenoSheet key={`sueno-${suenoDia}`} dia={suenoDia} registro={sueno.get(suenoDia)} perfil={perfil} onSave={(v) => guardarSueno(suenoDia, v)} onSkip={omitirSueno} />
        )}
        {editando && (
          <Editor
            key={editando.id}
            slot={editando}
            dia={formatDay(dia)}
            registro={registros.get(`${dia}|${editando.id}`)}
            onSave={(v) => guardar(editando, v)}
            onDelete={() => borrar(editando)}
            onClose={() => setEditando(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function IconBtn({ label, children, ...p }) {
  return <button aria-label={label} title={label} {...p} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200">{children}</button>
}
