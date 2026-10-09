// Todas las fechas viajan como YYYY-MM-DD en hora LOCAL (nunca toISOString, que usa UTC).
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (iso, n) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Lunes de la semana de `iso`. */
export const weekStart = (iso) => {
  const d = fromISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export const weekDays = (iso) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i))

export const formatDay = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('es', opts).format(fromISO(iso))
