import { SLOTS } from './slots'
import { addDays, toISO } from './dates'

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const minutosDormidos = (dormir, despertar) => (toMin(despertar) - toMin(dormir) + 1440) % 1440

export function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function fmtHora(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`
}

/**
 * Ids de los bloques de `dia` que se pasan dormidos (el bloque debe caber entero en el sueño).
 * - Sueño del propio día (al despertar): 00:00 → despertar si cruzó la medianoche; o dormir → despertar.
 * - Sueño del día siguiente que empezó de noche: esa parte cuenta para este día (dormir → 24:00).
 * - Hoy, sin sueño anotado, se supone el horario habitual de la mañana (la parte de la noche no se supone).
 */
export function slotsDormidos(dia, sueno, perfil) {
  const set = new Set()
  const add = (a, b) => SLOTS.forEach((s) => { if (s.start >= a && s.start + 30 <= b) set.add(s.id) })
  const propio = sueno.get(dia) ?? (perfil && dia === toISO(new Date()) ? perfil : null)
  if (propio) {
    const d = toMin(propio.dormir), w = toMin(propio.despertar)
    if (d > w) add(0, w); else add(d, w)
  }
  const manana = sueno.get(addDays(dia, 1))
  if (manana) {
    const d = toMin(manana.dormir), w = toMin(manana.despertar)
    if (d > w) add(d, 1440)
  }
  return set
}
