import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { api, saveSession } from '../lib/api'

const field =
  'w-full rounded-xl bg-zinc-200/70 px-4 py-3.5 text-[16px] outline-none ring-1 ring-transparent transition-shadow placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-brand'
const ease = [0.23, 1, 0.32, 1]
const rise = (i) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease, delay: i * 0.06 } })

export default function Login({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [form, setForm] = useState({ nombre: '', email: '', password: '', codigo: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const esRegistro = modo === 'registro'

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api(esRegistro ? 'registro' : 'login', form)
      const session = { token: res.token, name: res.name, email: res.email }
      saveSession(session)
      onLogin(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <motion.img {...rise(0)} src="/logo-mth.png" alt="MTH · Medición y Talento Humano" width="191" height="106" className="-ml-2 h-[88px] w-auto self-start" />

      <motion.h1 {...rise(1)} className="mt-8 text-[2.5rem] font-medium leading-[1.05] text-balance">
        La contabilidad de tu tiempo
      </motion.h1>
      <motion.p {...rise(2)} className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-zinc-500 text-pretty">
        Anota cada media hora de tu día. Al cerrar la semana verás en qué invertiste tu recurso más escaso.
      </motion.p>

      <motion.form {...rise(3)} onSubmit={submit} className="mt-9 space-y-3">
        <AnimatePresence initial={false}>
          {esRegistro && (
            <motion.div key="reg" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }} className="-m-0.5 space-y-3 overflow-hidden p-0.5">
              <input className={field} placeholder="Nombre" autoComplete="name" required value={form.nombre} onChange={set('nombre')} />
              <input className={field} placeholder="Código de acceso del curso" required value={form.codigo} onChange={set('codigo')} />
            </motion.div>
          )}
        </AnimatePresence>
        <input className={field} type="email" placeholder="Correo" autoComplete="email" required value={form.email} onChange={set('email')} />
        <input className={field} type="password" placeholder="Contraseña" autoComplete={esRegistro ? 'new-password' : 'current-password'} minLength={6} required value={form.password} onChange={set('password')} />

        <p role="alert" className="min-h-5 text-sm text-brand-deep">{error}</p>

        <button disabled={loading} className="btn-press flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-deep font-medium text-white hover:bg-brand-deep/90 disabled:opacity-60">
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {esRegistro ? 'Crear cuenta' : 'Entrar'}
        </button>
      </motion.form>

      <motion.button {...rise(4)} type="button" onClick={() => { setModo(esRegistro ? 'login' : 'registro'); setError('') }} className="mt-6 self-start text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
        {esRegistro ? 'Ya tengo cuenta' : 'Primera vez · crear cuenta'}
      </motion.button>
    </main>
  )
}
