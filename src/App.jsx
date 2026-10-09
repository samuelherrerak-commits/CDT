import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { LogOut, Plus } from 'lucide-react'
import { api, clearSession, getSession } from './lib/api'
import { addDays, formatDay, toISO, weekStart } from './lib/dates'
import { currentSlot, SLOTS } from './lib/slots'
import { useTimeNotifier } from './hooks/useTimeNotifier'
import { useNowMinutes } from './hooks/useNow'
import Login from './components/Login'
import DayView, { pendientesDeHoy } from './components/DayView'
import ReminderBanner from './components/ReminderBanner'
import Editor from './components/Editor'
import EstadoResultados from './components/EstadoResultados'

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
  const [registros, setRegistros] = useState(() => new Map()) // "fecha|hora" -> registro
  const [editando, setEditando] = useState(null) // slot
  const semana = weekStart(dia)
  const minutosAhora = useNowMinutes()

  const cargar = useCallback(async () => {
    try {
      const { data } = await api('registros', { desde: semana, hasta: addDays(semana, 6) })
      setRegistros((prev) => {
        const next = new Map([...prev].filter(([, r]) => r.fecha < semana || r.fecha > addDays(semana, 6)))
        data.forEach((r) => next.set(`${r.fecha}|${r.hora}`, r))
        return next
      })
    } catch (e) {
      if (e.auth) { toast.error('Tu sesión expiró'); onLogout() } else toast.error(e.message)
    }
  }, [semana, onLogout])

  useEffect(() => { cargar() }, [cargar])

  const abrirSlot = useCallback((id) => {
    const hoy = toISO(new Date())
    setDia(hoy)
    setTab('dia')
    const slot = SLOTS.find((s) => s.id === id) ?? currentSlot()
    if (slot) setEditando(slot)
  }, [])

  const hoyISO = toISO(new Date())
  const esHoy = dia === hoyISO
  const pendientes = pendientesDeHoy(registros, hoyISO, minutosAhora)

  const registrosRef = useMemo(() => ({ current: registros }), [registros])
  const { permission, requestPermission } = useTimeNotifier({
    enabled: true,
    needsReminder: (id) => !registrosRef.current.has(`${toISO(new Date())}|${id}`),
    onOpen: abrirSlot,
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
              ? <DayView dia={dia} setDia={setDia} registros={registros} onPick={setEditando} minutosAhora={minutosAhora} />
              : <EstadoResultados dia={dia} setDia={setDia} registros={registros} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {tab === 'dia' && esHoy && pendientes.length > 0 && !editando && (
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
