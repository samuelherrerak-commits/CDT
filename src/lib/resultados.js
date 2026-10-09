import { SLOTS, CATEGORIAS } from './slots'
import { weekDays, toISO } from './dates'

const HORAS_POR_BLOQUE = 0.5

/**
 * Estado de resultados de la semana de `anyDay`.
 * Capital = bloques transcurridos de la semana (no cuenta el futuro) × 0.5 h.
 * Lo que no se anotó es "sin registrar" (la consigna: "si no registras, escribe no registré").
 */
export function estadoResultados(registros, anyDay, now = new Date()) {
  const dias = weekDays(anyDay)
  const hoy = toISO(now)
  const minutosAhora = now.getHours() * 60 + now.getMinutes()

  let bloquesTranscurridos = 0
  for (const d of dias) {
    if (d < hoy) bloquesTranscurridos += SLOTS.length
    else if (d === hoy) bloquesTranscurridos += SLOTS.filter((s) => s.start + 30 <= minutosAhora).length
  }

  const horas = Object.fromEntries(CATEGORIAS.map((c) => [c.id, 0]))
  let registrados = 0
  const vistos = new Set()
  for (const r of registros) {
    const k = `${r.fecha}|${r.hora}`
    if (vistos.has(k) || !(r.categoria in horas)) continue
    vistos.add(k)
    horas[r.categoria] += HORAS_POR_BLOQUE
    registrados++
  }

  const capital = Math.max(bloquesTranscurridos, registrados) * HORAS_POR_BLOQUE
  const sinRegistrar = Math.max(capital - registrados * HORAS_POR_BLOQUE, 0)
  const pct = (h) => (capital ? Math.round((h / capital) * 100) : 0)

  const porDia = dias.map((d) => ({
    fecha: d,
    bloques: registros.filter((r) => r.fecha === d).length,
  }))

  return { capital, horas, sinRegistrar, registrados, pct, porDia }
}
