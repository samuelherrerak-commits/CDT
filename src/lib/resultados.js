import { SLOTS, CATEGORIAS } from './slots'
import { weekDays, toISO } from './dates'
import { toMin } from './sueno'

const HORAS_POR_BLOQUE = 0.5
const FIN_GRILLA = 22 * 60

/**
 * Estado de resultados de la semana de `anyDay`, con días de 24 h:
 *   sueño registrado + bloques de 06:00–22:00 (después de despertar) + hueco entre las 22:00 y la hora de acostarse.
 * Lo que no se anotó es "sin registrar" (la consigna: "si no registras, escribe no registré").
 * Solo cuenta el tiempo ya transcurrido.
 */
export function estadoResultados(registros, anyDay, now = new Date(), sueno = []) {
  const dias = weekDays(anyDay)
  const hoy = toISO(now)
  const minutosAhora = now.getHours() * 60 + now.getMinutes()
  const suenoPorDia = new Map(sueno.map((s) => [s.fecha, s]))

  const horas = Object.fromEntries(CATEGORIAS.map((c) => [c.id, 0]))
  const regPorDia = {}
  const vistos = new Set()
  let registrados = 0
  for (const r of registros) {
    const k = `${r.fecha}|${r.hora}`
    if (vistos.has(k) || !(r.categoria in horas)) continue
    vistos.add(k)
    horas[r.categoria] += HORAS_POR_BLOQUE
    regPorDia[r.fecha] = (regPorDia[r.fecha] || 0) + 1
    registrados++
  }

  let sinBloques = 0, horasSueno = 0, huecoNoche = 0
  for (const d of dias) {
    if (d > hoy) continue
    const s = suenoPorDia.get(d)
    const despierta = s ? toMin(s.despertar) : 0 // los bloques anteriores a despertar son sueño
    const transcurridos = SLOTS.filter((sl) => sl.start + 30 > despierta && (d < hoy || sl.start + 30 <= minutosAhora)).length
    sinBloques += Math.max(transcurridos - (regPorDia[d] || 0), 0)
    if (s) {
      horasSueno += s.minutos / 60
      const dormir = toMin(s.dormir)
      huecoNoche += Math.max((dormir < 360 ? dormir + 1440 : dormir) - FIN_GRILLA, 0) / 60
    }
  }

  const sinRegistrar = sinBloques * HORAS_POR_BLOQUE + huecoNoche
  const capital = registrados * HORAS_POR_BLOQUE + sinRegistrar + horasSueno
  const porDia = dias.map((d) => ({ fecha: d, bloques: regPorDia[d] || 0 }))

  return { capital, horas, sueno: horasSueno, sinRegistrar, registrados, porDia }
}
