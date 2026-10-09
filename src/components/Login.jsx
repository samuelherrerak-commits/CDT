import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { api, saveSession } from '../lib/api'

const field =
  'w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-[16px] outline-none ring-1 ring-transparent transition-shadow placeholder:text-zinc-400 focus:ring-zinc-900 dark:focus:ring-zinc-100'

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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Ejercicio</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-balance">La contabilidad de tu tiempo</h1>
        <p className="mt-3 text-sm text-zinc-500 text-pretty">
          El tiempo es tu recurso más escaso. Anótalo cada media hora y, al cerrar la semana, revisa tu estado de resultados.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <AnimatePresence initial={false}>
            {esRegistro && (
              <motion.div key="reg" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="space-y-3 overflow-hidden p-0.5 -m-0.5">
                <input className={field} placeholder="Nombre" autoComplete="name" required value={form.nombre} onChange={set('nombre')} />
                <input className={field} placeholder="Código de acceso (te lo da tu profesora)" required value={form.codigo} onChange={set('codigo')} />
              </motion.div>
            )}
          </AnimatePresence>
          <input className={field} type="email" placeholder="Correo" autoComplete="email" required value={form.email} onChange={set('email')} />
          <input className={field} type="password" placeholder="Contraseña" autoComplete={esRegistro ? 'new-password' : 'current-password'} minLength={6} required value={form.password} onChange={set('password')} />

          <p role="alert" className="min-h-5 text-sm text-red-500">{error}</p>

          <button disabled={loading} className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {esRegistro ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <button type="button" onClick={() => { setModo(esRegistro ? 'login' : 'registro'); setError('') }} className="mt-6 text-sm text-zinc-500 underline-offset-4 hover:underline">
          {esRegistro ? 'Ya tengo cuenta' : 'Primera vez · crear cuenta'}
        </button>
      </motion.div>
    </main>
  )
}
