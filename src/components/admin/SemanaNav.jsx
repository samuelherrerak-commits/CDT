import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDay } from '../../lib/dates'

export default function SemanaNav({ lunes, esActual, onChange }) {
  const domingo = addDays(lunes, 6)
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Semana anterior" onClick={() => onChange(addDays(lunes, -7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200"><ChevronLeft className="size-4" /></button>
      <span className="tnum min-w-[11rem] text-center text-sm text-zinc-600">{formatDay(lunes, { day: 'numeric', month: 'short' })} – {formatDay(domingo, { day: 'numeric', month: 'short' })}</span>
      <button aria-label="Semana siguiente" disabled={esActual} onClick={() => onChange(addDays(lunes, 7))} className="btn-press grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"><ChevronRight className="size-4" /></button>
    </div>
  )
}
