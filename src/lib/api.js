const URL_API = import.meta.env.VITE_API_URL
const SESSION_KEY = 'ct:session'

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}
export const saveSession = (s) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {}
}
export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

const CACHE_KEY = (email) => `ct:cache:${email}`
export const readCache = (email) => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY(email))) || [] } catch { return [] }
}
export const writeCache = (email, registros) => {
  try { localStorage.setItem(CACHE_KEY(email), JSON.stringify(registros)) } catch {}
}

export class ApiError extends Error {
  constructor(message, auth = false) {
    super(message)
    this.auth = auth
  }
}

/**
 * Apps Script no responde al preflight CORS, así que enviamos el JSON como
 * text/plain (sin cabeceras personalizadas) para evitar OPTIONS.
 */
export async function api(action, payload = {}) {
  if (!URL_API) throw new ApiError('Falta configurar VITE_API_URL')
  const session = getSession()
  let res
  try {
    res = await fetch(URL_API, {
      method: 'POST',
      body: JSON.stringify({ action, token: session?.token, ...payload }),
    })
  } catch {
    throw new ApiError('Sin conexión con el servidor')
  }
  const json = await res.json().catch(() => null)
  if (!json?.success) {
    const msg = json?.message || 'Error inesperado'
    throw new ApiError(msg, /Sesión/.test(msg))
  }
  // Sesión deslizante: el servidor devuelve un token nuevo y lo guardamos.
  if (json.token && session) saveSession({ ...session, token: json.token })
  return json
}
