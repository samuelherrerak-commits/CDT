import { useState } from 'react'
import Sheet, { timeField } from './Sheet'
import { fmtDur, minutosDormidos } from '../lib/sueno'
import { formatDay } from '../lib/dates'

/** "¿Cuánto dormiste?" — la noche anterior al día `dia` (día en que despertó). */
export default function SuenoSheet({ dia, registro, perfil, onSave, onSkip }) {
  const [dormir, setDormir] = useState(registro?.dormir ?? perfil?.dormir ?? '22:00')
  const [despertar, setDespertar] = useState(registro?.despertar ?? perfil?.despertar ?? '06:00')
  const [saving, setSaving] = useState(false)
  const minutos = dormir && despertar ? minutosDormidos(dormir, despertar) : 0
  const valido = minutos >= 30 && minutos <= 1200

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ dormir, despertar })
    setSaving(false)
  }

  return (
    <Sheet label="Registro de sueño" onClose={onSkip} onSubmit={submit}>
      <div>
        <h2 className="text-2xl font-medium">¿Cuánto dormiste?</h2>
        <p className="mt-1.5 text-sm text-zinc-500 first-letter:uppercase">Anota la noche que termina hoy, {formatDay(dia, { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-zinc-600">
          Me dormí a las
          <input type="time" required value={dormir} onChange={(e) => setDormir(e.target.value)} className={`${timeField} mt-1.5`} />
        </label>
        <label className="block text-sm text-zinc-600">
          Desperté a las
          <input type="time" required value={despertar} onChange={(e) => setDespertar(e.target.value)} className={`${timeField} mt-1.5`} />
        </label>
      </div>
      <p className={`tnum text-sm ${valido ? 'text-zinc-600' : 'text-brand-deep'}`} aria-live="polite">
        {valido ? <>Dormiste <span className="font-medium text-zinc-900">{fmtDur(minutos)}</span></> : 'Revisa las horas: el sueño debe durar entre 30 min y 20 h.'}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onSkip} className="btn-press h-12 rounded-xl px-4 text-zinc-600 hover:bg-zinc-200">Ahora no</button>
        <button disabled={saving || !valido} className="btn-press h-12 flex-1 rounded-xl bg-brand-deep font-medium text-white disabled:opacity-50">Guardar</button>
      </div>
    </Sheet>
  )
}
