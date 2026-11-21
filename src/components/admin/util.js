import { fromISO } from '../../lib/dates'

export const META_DIAS = 14
export const diasDesde = (iso, hoy) => Math.round((fromISO(hoy) - fromISO(iso)) / 86400000)
export const fmtH = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

export const ESTADOS = {
  aldia: { label: 'Al día', tono: 'text-zinc-600', punto: 'bg-teal' },
  riesgo: { label: 'Necesita atención', tono: 'text-brand-deep', punto: 'bg-brand' },
  sin: { label: 'Sin registros', tono: 'text-brand-deep', punto: 'bg-zinc-400' },
}

/** Estado de seguimiento: sin registros, sin actividad hace 2+ días, o al día. */
export function estadoDe(a, hoy) {
  const sinActividad = a.ultimo ? diasDesde(a.ultimo, hoy) : null
  const estado = !a.ultimo ? 'sin' : sinActividad >= 2 ? 'riesgo' : 'aldia'
  return { sinActividad, estado }
}

export function textoActividad(a) {
  if (!a.ultimo) return 'Sin registros todavía'
  if (a.sinActividad === 0) return 'Registró hoy'
  return `Última actividad hace ${plural(a.sinActividad, 'día', 'días')}`
}
