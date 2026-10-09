import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { currentSlot, SLOTS } from '../lib/slots'

const supported = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * Recordatorio en :00 y :30 mientras la app esté abierta (o instalada y en segundo plano).
 * Limitación honesta: sin un servidor de Web Push no se puede avisar con la app totalmente cerrada.
 * `needsReminder()` evita avisar si el bloque anterior ya está registrado.
 */
export function useTimeNotifier({ enabled, needsReminder, onOpen }) {
  const [permission, setPermission] = useState(supported() ? Notification.permission : 'unsupported')
  const last = useRef('')
  const needsRef = useRef(needsReminder)
  const openRef = useRef(onOpen)
  needsRef.current = needsReminder
  openRef.current = onOpen

  const requestPermission = useCallback(async () => {
    if (!supported()) return toast('Tu navegador no soporta notificaciones')
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') toast.success('Recordatorios activados')
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      const now = new Date()
      const m = now.getMinutes()
      if (m !== 0 && m !== 30) return
      const key = `${now.toDateString()}-${now.getHours()}:${m}`
      if (last.current === key) return
      // Solo entre 06:30 y 22:00, que es cuando termina un bloque válido.
      const mins = now.getHours() * 60 + m
      if (mins < SLOTS[0].start + 30 || mins > SLOTS.at(-1).start + 30) return
      last.current = key
      const prev = currentSlot(new Date(now.getTime() - 60_000))
      if (prev && !needsRef.current(prev.id)) return

      toast('Hora de tu registro', {
        description: prev ? `¿Qué hiciste de ${prev.label}?` : 'Anota en qué invertiste los últimos 30 minutos.',
        action: { label: 'Registrar', onClick: () => openRef.current?.(prev?.id) },
        duration: 15000,
      })
      if (supported() && Notification.permission === 'granted') {
        const opts = { body: prev ? `¿Qué hiciste de ${prev.label}?` : '¿Qué hiciste en esta última media hora?', tag: 'ct-recordatorio' }
        navigator.serviceWorker?.ready
          .then((reg) => reg.showNotification('La Contabilidad de tu Tiempo', opts))
          .catch(() => new Notification('La Contabilidad de tu Tiempo', opts))
      }
    }
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [enabled])

  return { permission, requestPermission }
}
