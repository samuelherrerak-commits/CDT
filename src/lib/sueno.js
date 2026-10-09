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
