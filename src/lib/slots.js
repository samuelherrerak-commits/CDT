// 32 bloques de 30 min: 06:00 → 22:00. `id` = hora de inicio en 24 h (clave en la hoja).
export const SLOTS = Array.from({ length: 32 }, (_, i) => {
  const mins = 6 * 60 + i * 30
  return { id: fmt24(mins), label: `${fmt12(mins)} – ${fmt12(mins + 30)}`, start: mins }
})

function fmt24(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function fmt12(m) {
  const h = Math.floor(m / 60)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`
}

/** Bloque en curso (o null fuera de 06:00–22:00). */
export function currentSlot(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes()
  return SLOTS.find((s) => m >= s.start && m < s.start + 30) ?? null
}

export const CATEGORIAS = [
  { id: 'inversion', label: 'Inversión', hint: 'Trabajo, estudio, metas', dot: 'bg-brand' },
  { id: 'gasto', label: 'Gasto corriente', hint: 'Ocio, redes, distracción', dot: 'bg-ochre' },
  { id: 'mantenimiento', label: 'Mantenimiento', hint: 'Comer, dormir, aseo, traslados', dot: 'bg-teal' },
]
export const catById = (id) => CATEGORIAS.find((c) => c.id === id)
