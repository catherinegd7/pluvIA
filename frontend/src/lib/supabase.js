import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const forzarDemo = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true'

const credencialesValidas = Boolean(url && key && !url.includes('TU-PROYECTO'))

/** null cuando no hay credenciales → la app usa los datos de demostración. */
export const supabase = credencialesValidas && !forzarDemo ? createClient(url, key) : null

export const MODO = supabase ? 'supabase' : 'demo'
