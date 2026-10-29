// Evita "inyección de fórmulas": un alumno podría escribir =HIPERVINCULO(...) como actividad y Excel lo ejecutaría.
const esc = (v) => {
  let t = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return `"${t.replace(/"/g, '""')}"`
}

export function descargarCSV(nombre, columnas, filas) {
  const head = columnas.map((c) => esc(c.label)).join(',')
  const body = filas.map((f) => columnas.map((c) => esc(f[c.key])).join(','))
  const blob = new Blob(['﻿' + [head, ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' }) // BOM: acentos en Excel
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
