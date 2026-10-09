import { useEffect, useState } from 'react'

/** Minutos desde medianoche, refrescado cada 20 s para que "pendientes" avance solo. */
export function useNowMinutes() {
  const calc = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }
  const [m, setM] = useState(calc)
  useEffect(() => {
    const tick = () => setM(calc())
    const id = setInterval(tick, 20_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])
  return m
}
