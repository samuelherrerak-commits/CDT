import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Share, X } from 'lucide-react'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const KEY = 'ct:hint-dismissed'

/**
 * iPhone: las notificaciones web SOLO existen si la app está en la pantalla de inicio (iOS 16.4+),
 * por eso en Safari normal no hay permiso que pedir: se muestra cómo instalarla.
 */
export default function ReminderBanner({ permission, onEnable }) {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, '1') } catch {} }

  let content = null
  if (isIOS() && !isStandalone()) {
    content = (
      <>
        <Share className="mt-0.5 size-4 shrink-0" />
        <p className="flex-1 text-sm text-pretty">
          <span className="font-medium">Recordatorios en iPhone:</span> toca <b>Compartir</b> en Safari → <b>Añadir a pantalla de inicio</b>, abre la app desde ahí y activa los avisos.
        </p>
      </>
    )
  } else if (permission === 'default') {
    content = (
      <>
        <Bell className="mt-0.5 size-4 shrink-0" />
        <p className="flex-1 text-sm">Recibe un aviso cada 30 min para registrar.</p>
        <button onClick={onEnable} className="btn-press rounded-full bg-brand-deep px-3.5 py-2 text-xs font-medium text-white">Activar</button>
      </>
    )
  } else if (permission === 'denied') {
    content = <><Bell className="mt-0.5 size-4 shrink-0" /><p className="flex-1 text-sm">Los avisos están bloqueados. Actívalos en Ajustes → Notificaciones → Mi Tiempo (o en los permisos del sitio).</p></>
  }
  const show = content && !hidden

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 text-zinc-700 ring-1 ring-zinc-900/10">
            {content}
            <button onClick={dismiss} aria-label="Cerrar" className="btn-press -m-1 grid size-7 place-items-center rounded-full text-zinc-400"><X className="size-4" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
