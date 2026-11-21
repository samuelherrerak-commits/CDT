import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { catById } from '../../lib/slots'
import { descargarCSV } from '../../lib/csv'

const OPCIONES = [
  { tipo: 'registros', titulo: 'Registros', detalle: 'Una fila por bloque: alumno, correo, fecha, hora de inicio, actividad y categoría.' },
  { tipo: 'sueno', titulo: 'Sueño', detalle: 'Una fila por noche: alumno, fecha en que despertó, hora de dormir, de despertar y minutos.' },
]

export default function Exportar({ lunes, domingo }) {
  const [ocupado, setOcupado] = useState('')

  async function exportar(tipo, todo) {
    setOcupado(`${tipo}-${todo}`)
    try {
      const r = await api('admin_exportar', { desde: todo ? '2000-01-01' : lunes, hasta: todo ? '2999-12-31' : domingo })
      const sufijo = todo ? 'curso-completo' : `semana-${lunes}`
      if (tipo === 'registros') {
        descargarCSV(`registros-${sufijo}.csv`, [
          { key: 'nombre', label: 'Alumno' }, { key: 'email', label: 'Correo' }, { key: 'fecha', label: 'Fecha' },
          { key: 'hora', label: 'Hora (inicio del bloque)' }, { key: 'actividad', label: 'Actividad' }, { key: 'categoria', label: 'Categoría' },
        ], r.registros.map((x) => ({ ...x, categoria: catById(x.categoria)?.label ?? x.categoria })))
      } else {
        descargarCSV(`sueno-${sufijo}.csv`, [
          { key: 'nombre', label: 'Alumno' }, { key: 'email', label: 'Correo' }, { key: 'fecha', label: 'Fecha (despertó)' },
          { key: 'dormir', label: 'Se durmió' }, { key: 'despertar', label: 'Despertó' }, { key: 'minutos', label: 'Minutos' },
        ], r.sueno)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setOcupado('')
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[15px] leading-relaxed text-zinc-600 text-pretty">Archivos CSV que abren en Excel o Google Sheets, con acentos. Incluyen a todos los alumnos; las cuentas de administrador no aparecen.</p>
      <ul className="mt-6 divide-y divide-zinc-300 border-y border-zinc-300">
        {OPCIONES.map((o) => (
          <li key={o.tipo} className="py-5">
            <h3 className="text-lg font-medium">{o.titulo}</h3>
            <p className="mt-1 text-sm text-zinc-500 text-pretty">{o.detalle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[['Esta semana', false], ['Todo el curso', true]].map(([t, todo]) => (
                <button key={t} disabled={!!ocupado} onClick={() => exportar(o.tipo, todo)} className="btn-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 ring-zinc-900/15 hover:bg-zinc-200 disabled:opacity-60">
                  <Download className="size-4" aria-hidden />{ocupado === `${o.tipo}-${todo}` ? 'Preparando…' : t}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
