import { useState } from 'react'
import Sheet, { timeField } from './Sheet'

/** Horario habitual de sueño: se pide en la primera sesión y se puede editar desde el encabezado. */
export default function PerfilSueno({ inicial, onSave, onClose }) {
  const [dormir, setDormir] = useState(inicial?.dormir ?? '22:00')
  const [despertar, setDespertar] = useState(inicial?.despertar ?? '06:00')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({ dormir, despertar })
    setSaving(false)
  }

  return (
    <Sheet label="Horario habitual de sueño" onClose={onClose} onSubmit={submit}>
      <div>
        <h2 className="text-2xl font-medium">Tu horario de sueño</h2>
        <p className="mt-1.5 text-sm text-zinc-500 text-pretty">
          Te avisaremos cuando sea hora de acostarte y de despertar. Podrás cambiarlo cuando quieras.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-zinc-600">
          Me acuesto a las
          <input type="time" required value={dormir} onChange={(e) => setDormir(e.target.value)} className={`${timeField} mt-1.5`} />
        </label>
        <label className="block text-sm text-zinc-600">
          Me despierto a las
          <input type="time" required value={despertar} onChange={(e) => setDespertar(e.target.value)} className={`${timeField} mt-1.5`} />
        </label>
      </div>
      <div className="flex gap-2">
        {onClose && <button type="button" onClick={onClose} className="btn-press h-12 rounded-xl px-4 text-zinc-600 hover:bg-zinc-200">Cancelar</button>}
        <button disabled={saving} className="btn-press h-12 flex-1 rounded-xl bg-brand-deep font-medium text-white disabled:opacity-60">Guardar horario</button>
      </div>
    </Sheet>
  )
}
