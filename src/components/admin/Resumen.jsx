import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { CATEGORIAS, SUENO } from '../../lib/slots'
import { addDays, formatDay } from '../../lib/dates'
import { ESTADOS, META_DIAS, fmtH, plural, textoActividad } from './util'

const ease = [0.23, 1, 0.32, 1]

const Seccion = ({ titulo, nota, children }) => (
  <section>
    <h2 className="text-xl font-medium">{titulo}</h2>
    {nota && <p className="mt-0.5 text-sm text-zinc-500">{nota}</p>}
    <div className="mt-3">{children}</div>
  </section>
)

/** Panorama del grupo: cómo va, quién necesita atención y qué tan cerca está de la meta. */
export default function Resumen({ alumnos, porDia, lunes, hoy, onAbrir, onVerTodos }) {
  const n = alumnos.length
  const atencion = alumnos.filter((a) => a.estado !== 'aldia')
  const registraronHoy = alumnos.filter((a) => a.bloquesHoy > 0).length
  const cumplProm = n ? Math.round(alumnos.reduce((t, a) => t + a.cumpl, 0) / n) : 0
  const pendientes = alumnos.filter((a) => a.pendientePassword).length

  const prom = (key) => (n ? alumnos.reduce((t, a) => t + (key === 'sueno' ? a.suenoMin / 60 : a.porCat[key] * 0.5), 0) / n : 0)
  const filasCat = [
    ...CATEGORIAS.map((c) => ({ key: c.id, label: c.label, dot: c.dot, h: prom(c.id) })),
    { key: 'sueno', label: SUENO.label, dot: SUENO.dot, h: prom('sueno') },
  ]
  const maxH = Math.max(...filasCat.map((f) => f.h), 1)

  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const metas = [7, 14, 21].map((m) => ({ m, k: alumnos.filter((a) => a.diasCompletos >= m).length }))

  const filas = [
    ['Alumnos', String(n)],
    ['Registraron hoy', `${registraronHoy} de ${n}`],
    ['Cumplimiento promedio esta semana', `${cumplProm}%`],
    ['Necesitan atención', String(atencion.length), atencion.length > 0],
    ['Contraseña por recrear', String(pendientes)],
  ]

  return (
    <div className="grid gap-x-14 gap-y-12 xl:grid-cols-2">
      <div className="min-w-0 space-y-12">
        <Seccion titulo="Estado del grupo">
          <dl>
            {filas.map(([k, v, alerta], i) => (
              <div key={k} className={`flex items-baseline justify-between py-3 ${i === 0 ? 'border-y border-zinc-900' : 'border-b border-zinc-300'}`}>
                <dt className="text-[15px] text-zinc-700">{k}</dt>
                <dd className={`tnum text-lg font-medium ${alerta ? 'text-brand-deep' : ''}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </Seccion>

        <Seccion titulo="Actividad de la semana" nota="Alumnos que registraron algo cada día.">
          <div className="grid grid-cols-7 gap-2">
            {dias.map((d, i) => {
              const k = porDia[d]?.alumnos ?? 0
              const futuro = d > hoy
              return (
                <div key={d} className="text-center">
                  <div className="flex h-28 items-end overflow-hidden rounded-lg bg-zinc-200">
                    <motion.div key={`${lunes}-${d}-${n}`} className="w-full rounded-lg bg-brand" initial={{ height: 0 }} animate={{ height: `${n ? (k / n) * 100 : 0}%` }} transition={{ duration: 0.55, ease, delay: i * 0.04 }} />
                  </div>
                  <span className="mt-1.5 block text-xs text-zinc-500 first-letter:uppercase">{formatDay(d, { weekday: 'short' }).replace('.', '')}</span>
                  <span className={`tnum block text-xs ${futuro ? 'text-zinc-300' : 'text-zinc-600'}`}>{futuro ? '–' : k}</span>
                </div>
              )
            })}
          </div>
        </Seccion>

        <Seccion titulo="Avance hacia la meta" nota={`Alumnos con días completos (24 o más bloques). La meta es ${META_DIAS} días.`}>
          <ul>
            {metas.map(({ m, k }, i) => (
              <li key={m} className="border-b border-zinc-300 py-3">
                <div className="flex items-baseline justify-between text-[15px]">
                  <span>{m} días completos{m === META_DIAS && <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-deep">meta</span>}</span>
                  <span className="tnum text-zinc-600">{k} de {n}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200">
                  <motion.div key={`${m}-${k}-${n}`} className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${n ? (k / n) * 100 : 0}%` }} transition={{ duration: 0.6, ease, delay: i * 0.05 }} />
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      </div>

      <div className="min-w-0 space-y-12">
        <Seccion titulo="Requieren atención" nota="Sin actividad hace 2 días o más, o sin registros.">
          {atencion.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-900/10">
              <span className="grid size-8 place-items-center rounded-full bg-brand-tint text-brand-deep"><Check className="size-4" /></span>
              <p className="text-sm text-zinc-600">Todo el grupo está al día.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-300 border-y border-zinc-300">
              {[...atencion].sort((a, b) => (b.sinActividad ?? 999) - (a.sinActividad ?? 999)).slice(0, 7).map((a) => (
                <li key={a.email}>
                  <button onClick={() => onAbrir(a)} className="btn-press flex w-full items-center gap-3 py-3 text-left">
                    <span className={`size-2 shrink-0 rounded-full ${ESTADOS[a.estado].punto}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.nombre}</span>
                      <span className="block truncate text-sm text-brand-deep">{textoActividad(a)}</span>
                    </span>
                    <span className="tnum text-sm text-zinc-500">{a.cumpl}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {atencion.length > 7 && <button onClick={onVerTodos} className="btn-press mt-3 text-sm font-medium text-brand-deep underline underline-offset-4">Ver los {atencion.length} en Alumnos</button>}
        </Seccion>

        <Seccion titulo="Promedio por alumno" nota="Horas de esta semana. Muestra en qué se va el tiempo del grupo.">
          <dl>
            {filasCat.map((f, i) => (
              <div key={f.key} className="border-b border-zinc-300 py-3">
                <div className="flex items-baseline justify-between text-[15px]">
                  <dt className="flex items-center gap-2.5"><span className={`size-2 rounded-full ${f.dot}`} />{f.label}</dt>
                  <dd className="tnum">{fmtH(f.h)}</dd>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200">
                  <motion.div key={`${lunes}-${f.key}-${n}`} className={`h-full rounded-full ${f.dot}`} initial={{ width: 0 }} animate={{ width: `${(f.h / maxH) * 100}%` }} transition={{ duration: 0.6, ease, delay: i * 0.05 }} />
                </div>
              </div>
            ))}
          </dl>
        </Seccion>
      </div>
    </div>
  )
}
