/**
 * Capa de datos del frontend.
 *
 * Todas las páginas piden datos SOLO a través de este archivo. Por dentro decide si
 * consulta Supabase o la base de demostración, así que cuando la BD esté lista no hay
 * que tocar ninguna página: solo poner las credenciales en el archivo .env.
 */
import { supabase, MODO } from '../lib/supabase'
import { TABLAS, VALORES } from '../config/db'

// Los datos de demostración solo se cargan si no hay Supabase configurado
let demo = null
const cargarDemo = () => (demo ??= import('./mockData'))

/** Controles del simulador (solo modo demo). */
export const simulador = async () => (await cargarDemo()).simulador

export { MODO }

/**
 * Consulta genérica a una tabla.
 * @param {keyof TABLAS} tabla clave de la tabla (ej. 'medicion')
 * @param {{eq?:object, in?:object, gte?:object, lte?:object, orden?:[string, boolean], limite?:number, rango?:[number, number], contar?:boolean}} op
 */
async function listar(tabla, op = {}) {
  if (supabase) {
    let q = supabase.from(TABLAS[tabla]).select('*', op.contar ? { count: 'exact' } : undefined)
    for (const [c, v] of Object.entries(op.eq ?? {})) if (v != null && v !== '') q = q.eq(c, v)
    for (const [c, v] of Object.entries(op.in ?? {})) if (v) q = q.in(c, v)
    for (const [c, v] of Object.entries(op.notIn ?? {})) if (v) q = q.not(c, 'in', `(${v.map((x) => `"${x}"`).join(',')})`)
    for (const [c, v] of Object.entries(op.gte ?? {})) if (v != null) q = q.gte(c, v)
    for (const [c, v] of Object.entries(op.lte ?? {})) if (v != null) q = q.lte(c, v)
    if (op.orden) q = q.order(op.orden[0], { ascending: op.orden[1] })
    if (op.rango) q = q.range(op.rango[0], op.rango[1])
    else if (op.limite) q = q.limit(op.limite)
    const { data, error, count } = await q
    if (error) throw new Error(`${TABLAS[tabla]}: ${error.message}`)
    return op.contar ? { filas: data ?? [], total: count ?? 0 } : data ?? []
  }

  // ----- modo demo: mismas reglas aplicadas en memoria -----
  const demoDb = (await cargarDemo()).db
  let filas = demoDb[tabla].slice()
  for (const [c, v] of Object.entries(op.eq ?? {})) if (v != null && v !== '') filas = filas.filter((f) => String(f[c]) === String(v))
  for (const [c, v] of Object.entries(op.in ?? {})) if (v) filas = filas.filter((f) => v.map(String).includes(String(f[c])))
  for (const [c, v] of Object.entries(op.notIn ?? {})) if (v) filas = filas.filter((f) => !v.map(String).includes(String(f[c])))
  for (const [c, v] of Object.entries(op.gte ?? {})) if (v != null) filas = filas.filter((f) => f[c] != null && f[c] >= v)
  for (const [c, v] of Object.entries(op.lte ?? {})) if (v != null) filas = filas.filter((f) => f[c] != null && f[c] <= v)
  if (op.orden) {
    const [c, asc] = op.orden
    filas.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1))
  }
  const total = filas.length
  if (op.rango) filas = filas.slice(op.rango[0], op.rango[1] + 1)
  else if (op.limite) filas = filas.slice(0, op.limite)
  await new Promise((r) => setTimeout(r, 120)) // simula la latencia de red
  return op.contar ? { filas: structuredClone(filas), total } : structuredClone(filas)
}

/** Tablas pequeñas que describen la infraestructura. */
export async function cargarCatalogo() {
  const [coladeras, dispositivos, sensores, actuadores, tipos] = await Promise.all([
    listar('coladera', { orden: ['id_coladera', true] }),
    listar('dispositivo'),
    listar('sensor'),
    listar('actuador'),
    listar('tipoVariable'),
  ])
  return { coladeras, dispositivos, sensores, actuadores, tipos }
}

/** Últimas lecturas de un sensor (se usa para el "estado actual"). */
export const ultimasDeSensor = (idSensor, limite = 8) =>
  listar('medicion', { eq: { id_sensor: idSensor }, orden: ['fecha_hora', false], limite })

/** Serie de tiempo de uno o varios sensores (ordenada de la más vieja a la más nueva). */
export async function serie({ idSensores, idTipo, desde, limite = 1000 }) {
  const filas = await listar('medicion', {
    in: { id_sensor: idSensores },
    eq: { id_tipo_variable: idTipo },
    gte: { fecha_hora: desde },
    orden: ['fecha_hora', false],
    limite,
  })
  return filas.reverse()
}

/** Variantes de escritura de los valores válidos ("valida", "Válida", "VALIDA"…) para filtrar en la BD. */
const variantes = (lista) => [...new Set(lista.flatMap((v) => [v, v.toUpperCase(), v[0].toUpperCase() + v.slice(1), v.replace('a', 'á'), v.replace('a', 'á').replace(/^./, (x) => x.toUpperCase())]))]

/** Historial paginado de mediciones (RF03). calidad: '' | 'valida' | 'invalida' */
export const buscarMediciones = ({ idSensores, idTipo, calidad, desde, hasta, pagina = 0, porPagina = 25 }) =>
  listar('medicion', {
    in: { id_sensor: idSensores, calidad_dato: calidad === 'valida' ? variantes(VALORES.calidadValida) : undefined },
    notIn: { calidad_dato: calidad === 'invalida' ? variantes(VALORES.calidadValida) : undefined },
    eq: { id_tipo_variable: idTipo },
    gte: { fecha_hora: desde },
    lte: { fecha_hora: hasta },
    orden: ['fecha_hora', false],
    rango: [pagina * porPagina, pagina * porPagina + porPagina - 1],
    contar: true,
  })

export const cargarAlertas = ({ desde, limite = 500 } = {}) =>
  listar('alerta', { gte: { fecha_hora: desde }, orden: ['fecha_hora', false], limite })

export const cargarLimpiezas = ({ desde, limite = 500 } = {}) =>
  listar('accionLimpieza', { gte: { fecha_inicio: desde }, orden: ['fecha_inicio', false], limite })

/** Mediciones por id (para saber qué lectura disparó cada alerta). */
export const medicionesPorId = (ids) =>
  ids.length ? listar('medicion', { in: { id_medicion: ids } }) : Promise.resolve([])

/** Total de registros por tabla (sección "Bajo el capó"). */
export async function contarTablas() {
  const claves = Object.keys(TABLAS)
  if (!supabase) {
    const demoDb = (await cargarDemo()).db
    return Object.fromEntries(claves.map((k) => [k, demoDb[k].length]))
  }
  const res = await Promise.all(
    claves.map(async (k) => {
      const { count, error } = await supabase.from(TABLAS[k]).select('*', { count: 'exact', head: true })
      return [k, error ? null : count]
    }),
  )
  return Object.fromEntries(res)
}

/**
 * Tiempo real. Llama a `fn({ tabla, tipo, fila })` cada vez que llega un INSERT/UPDATE.
 * En Supabase hay que activar Realtime en las tablas (Database → Replication).
 * Devuelve una función para cancelar la suscripción.
 */
export function suscribirse(fn, onEstado) {
  if (!supabase) {
    let cancelar = null
    let cancelado = false
    cargarDemo().then((m) => {
      if (cancelado) return
      cancelar = m.suscribirDemo(fn)
      onEstado?.('conectado')
    })
    return () => {
      cancelado = true
      cancelar?.()
    }
  }
  const inverso = Object.fromEntries(Object.entries(TABLAS).map(([k, v]) => [v, k]))
  const canal = supabase.channel('pluvia-tiempo-real')
  for (const tabla of ['medicion', 'alerta', 'accionLimpieza', 'actuador', 'dispositivo', 'coladera']) {
    canal.on('postgres_changes', { event: '*', schema: 'public', table: TABLAS[tabla] }, (p) => {
      if (p.eventType === 'DELETE') return
      fn({ tabla: inverso[p.table] ?? tabla, tipo: p.eventType, fila: p.new })
    })
  }
  canal.subscribe((estado) => onEstado?.(estado === 'SUBSCRIBED' ? 'conectado' : estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' ? 'error' : 'conectando'))
  return () => supabase.removeChannel(canal)
}
