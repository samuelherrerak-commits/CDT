import { useEffect } from 'react'
import { motion } from 'framer-motion'

/** Hoja inferior en móvil / diálogo centrado en escritorio. Si `onClose` falta, no se puede descartar. */
export default function Sheet({ label, onClose, children, onSubmit }) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="absolute inset-0 bg-zinc-900/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
      <motion.form
        onSubmit={onSubmit}
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
        className="relative w-full max-w-md space-y-5 rounded-t-3xl bg-zinc-50 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.08)] ring-1 ring-zinc-900/10 sm:rounded-3xl"
      >
        {children}
      </motion.form>
    </div>
  )
}

export const timeField =
  'w-full rounded-xl bg-zinc-200/70 px-4 py-3.5 text-[18px] tnum outline-none ring-1 ring-transparent transition-shadow focus:bg-zinc-50 focus:ring-brand'
