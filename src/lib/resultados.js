import { SLOTS, CATEGORIAS } from './slots'
import { weekDays, toISO } from './dates'
import { slotsDormidos } from './sueno'

const HORAS_POR_BLOQUE = 0.5

const transcurridos = (d, hoy, minutosAhora) =>
  SLOTS.filter((s) => d < hoy || (d === hoy && s.start + 30 <= minutosAhora))

/**
 * Estado de resultados de la semana de `anyDay`. Cada día suma 24 h: bloques registrados por categoría
 * + bloques dormidos (según el sueño anotado) + "sin registrar" (lo despierto que no se anotó).
 * Un bloque con registro cuenta como registro aunque caiga dentro del sueño (p. ej. un despertar nocturno).
 * Solo cuenta el tiempo ya transcurrido.
 */
export function estadoResultados(registros, anyDay, now = new Date(), sueno = []) {
  const dias = weekDays(anyDay)
  const hoy = toISO(now)
  const minutosAhora = now.getHours() * 60 + now.getMinutes()
  const suenoPorDia = new Map(sueno.map((s) => [s.fecha, s]))

  const horas = Object.fromEntries(CATEGORIAS.map((c) => [c.id, 0]))
  const regKeys = new Set()
  const regPorDia = {}
  let registrados = 0
  for (const r of registros) {
    const k = `${r.fecha}|${r.hora}`
    if (regKeys.has(k) || !(r.categoria in horas)) continue
    regKeys.add(k)
    horas[r.categoria] += HORAS_POR_BLOQUE
    regPorDia[r.fecha] = (regPorDia[r.fecha] || 0) + 1
    registrados++
  }

  let bloquesSueno = 0, bloquesSin = 0, bloquesTotal = 0
  for (const d of dias) {
    if (d > hoy) continue
    const dormidos = slotsDormidos(d, suenoPorDia, null)
    for (const s of transcurridos(d, hoy, minutosAhora)) {
      bloquesTotal++
      if (regKeys.has(`${d}|${s.id}`)) continue
      if (dormidos.has(s.id)) bloquesSueno++
      else bloquesSin++
    }
  }

  const sueno_ = bloquesSueno * HORAS_POR_BLOQUE
  const sinRegistrar = bloquesSin * HORAS_POR_BLOQUE
  const capital = Math.max(bloquesTotal, registrados) * HORAS_POR_BLOQUE
  const porDia = dias.map((d) => ({ fecha: d, bloques: regPorDia[d] || 0 }))

  return { capital, horas, sueno: sueno_, sinRegistrar, registrados, porDia }
}

/** Bloques que ya debieron registrarse en la semana de `anyDay`, suponiendo ~8 h de sueño (2/3 del día despierto). */
export function bloquesEsperados(anyDay, now = new Date()) {
  const hoy = toISO(now)
  const minutosAhora = now.getHours() * 60 + now.getMinutes()
  let n = 0
  for (const d of weekDays(anyDay)) n += transcurridos(d, hoy, minutosAhora).length
  return Math.round((n * 2) / 3)
}
