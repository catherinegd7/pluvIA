/**
 * Base de datos de DEMOSTRACIÓN.
 *
 * Genera datos con exactamente las mismas tablas y columnas del diccionario de datos
 * (Coladera, Dispositivo, Sensor, TipoVariable, Medicion, Actuador, Alerta, AccionLimpieza)
 * para poder construir y presentar el frontend aunque Supabase todavía no esté listo.
 * También simula el envío de lecturas "en vivo" como lo haría el ESP8266.
 */

// ---------- utilidades ----------
function semilla(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = semilla(20261113)
const entre = (a, b) => a + rnd() * (b - a)
const r1 = (n) => Math.round(n * 10) / 10
const iso = (ms) => new Date(ms).toISOString()
const MIN = 60_000
const HORA = 60 * MIN

const AHORA = Date.now()
const PASO = 15 * MIN
const DIAS = 7
const INICIO = AHORA - DIAS * 24 * HORA

// ---------- catálogo ----------
const coladeras = [
  { id_coladera: 1, codigo: 'CI-MTY-001', calle: 'Av. Constitución 1200', colonia: 'Centro', municipio: 'Monterrey', estado_operativo: 'activa', distancia_referencia_cm: 40, umbral_obstruccion_cm: 10 },
  { id_coladera: 2, codigo: 'CI-MTY-002', calle: 'Av. Eugenio Garza Sada 2501', colonia: 'Tecnológico', municipio: 'Monterrey', estado_operativo: 'activa', distancia_referencia_cm: 40, umbral_obstruccion_cm: 10 },
  { id_coladera: 3, codigo: 'CI-SPG-003', calle: 'Calzada del Valle 400', colonia: 'Del Valle', municipio: 'San Pedro Garza García', estado_operativo: 'activa', distancia_referencia_cm: 45, umbral_obstruccion_cm: 10 },
  { id_coladera: 4, codigo: 'CI-MTY-004', calle: 'Av. Revolución 3000', colonia: 'Contry', municipio: 'Monterrey', estado_operativo: 'activa', distancia_referencia_cm: 40, umbral_obstruccion_cm: 10 },
  { id_coladera: 5, codigo: 'CI-GPE-005', calle: 'Av. Miguel Alemán 850', colonia: 'Linda Vista', municipio: 'Guadalupe', estado_operativo: 'mantenimiento', distancia_referencia_cm: 40, umbral_obstruccion_cm: 10 },
  { id_coladera: 6, codigo: 'CI-SNI-006', calle: 'Av. Universidad 1500', colonia: 'Anáhuac', municipio: 'San Nicolás de los Garza', estado_operativo: 'activa', distancia_referencia_cm: 45, umbral_obstruccion_cm: 10 },
]

// Cómo termina cada coladera "ahora" y qué tan rápido se llena (cm/h sin lluvia)
const PLAN = {
  1: { fin: 8.7, tasa: 0.32, presenciaAhora: true },
  2: { fin: 16.2, tasa: 0.27 },
  3: { fin: 31.5, tasa: 0.18 },
  4: { fin: 23.6, tasa: 0.24 },
  5: { fin: 19.4, tasa: 0.2, cortaHace: 26 * HORA },
  6: { fin: 36.8, tasa: 0.3 },
}

const tiposVariable = [
  { id_tipo_variable: 1, nombre_variable: 'distancia', unidad_medida: 'cm' },
  { id_tipo_variable: 2, nombre_variable: 'temperatura', unidad_medida: '°C' },
  { id_tipo_variable: 3, nombre_variable: 'humedad', unidad_medida: '%' },
  { id_tipo_variable: 4, nombre_variable: 'luz', unidad_medida: '%' },
  { id_tipo_variable: 5, nombre_variable: 'presencia', unidad_medida: 'bool' },
]

const dispositivos = []
const sensores = []
const actuadores = []
for (const c of coladeras) {
  const n = String(c.id_coladera).padStart(3, '0')
  const esp32 = c.id_coladera === 3
  const desconectado = c.estado_operativo === 'mantenimiento'
  dispositivos.push({
    id_dispositivo: c.id_coladera,
    numero_serie: `${esp32 ? 'ESP32' : 'ESP8266'}-${(0xa1f0 + c.id_coladera * 37).toString(16).toUpperCase()}-${n}`,
    modelo: esp32 ? 'ESP32 DevKit V1' : 'NodeMCU ESP8266',
    estado_conexion: desconectado ? 'desconectado' : 'en_linea',
    fecha_instalacion: `2026-10-${String(6 + c.id_coladera * 2).padStart(2, '0')}`,
    id_coladera: c.id_coladera,
  })
  const base = (c.id_coladera - 1) * 4
  const est = desconectado ? 'sin_respuesta' : 'operativo'
  sensores.push(
    { id_sensor: base + 1, codigo_sensor: `US-${n}`, tipo_sensor: 'Ultrasónico', modelo: 'JSN-SR04T', estado_sensor: est, id_dispositivo: c.id_coladera },
    { id_sensor: base + 2, codigo_sensor: `DHT-${n}`, tipo_sensor: 'Temperatura/Humedad', modelo: 'DHT22', estado_sensor: est, id_dispositivo: c.id_coladera },
    { id_sensor: base + 3, codigo_sensor: `LDR-${n}`, tipo_sensor: 'Luz', modelo: 'Fotorresistencia LDR', estado_sensor: est, id_dispositivo: c.id_coladera },
    { id_sensor: base + 4, codigo_sensor: `PIR-${n}`, tipo_sensor: 'Presencia', modelo: 'HC-SR501', estado_sensor: est, id_dispositivo: c.id_coladera },
  )
  const crit = PLAN[c.id_coladera].fin <= c.umbral_obstruccion_cm
  actuadores.push(
    { id_actuador: (c.id_coladera - 1) * 2 + 1, codigo_actuador: `SRV-${n}`, tipo_actuador: 'Servomotor', estado_actual: crit ? 'en_espera' : 'reposo', id_dispositivo: c.id_coladera },
    { id_actuador: (c.id_coladera - 1) * 2 + 2, codigo_actuador: `LED-${n}`, tipo_actuador: 'LED', estado_actual: crit ? 'rojo' : PLAN[c.id_coladera].fin <= 22 ? 'ambar' : 'apagado', id_dispositivo: c.id_coladera },
  )
}

// ---------- clima compartido (Monterrey, noviembre) ----------
const tormentas = [
  [AHORA - 6 * 24 * HORA + 2 * HORA, 7 * HORA, 0.9],
  [AHORA - 4 * 24 * HORA - 5 * HORA, 3 * HORA, 0.45],
  [AHORA - 2 * 24 * HORA - 9 * HORA, 6 * HORA, 1],
  [AHORA - 20 * HORA, 4 * HORA, 0.55],
  [AHORA - 2.5 * HORA, 3 * HORA, 0.35], // llovizna actual
]
let lluviaForzada = null
export function lluvia(t) {
  if (lluviaForzada != null && t >= AHORA) return lluviaForzada
  let v = 0
  for (const [ini, dur, int] of tormentas) {
    if (t >= ini && t <= ini + dur) v = Math.max(v, int * Math.sin((Math.PI * (t - ini)) / dur) ** 0.6)
  }
  return v
}
function horaDelDia(t) {
  const d = new Date(t)
  return d.getHours() + d.getMinutes() / 60
}
function clima(t, idColadera, r = rnd) {
  const h = horaDelDia(t)
  const ll = lluvia(t)
  const ciclo = Math.sin((2 * Math.PI * (h - 9)) / 24) // máx ~15 h
  const temperatura = 19.5 + 6 * ciclo - 4.5 * ll + (idColadera % 3) * 0.4 + (r() - 0.5) * 0.6
  const humedad = Math.min(99, Math.max(22, 52 - 16 * ciclo + 42 * ll + (r() - 0.5) * 3))
  const sol = h > 6.8 && h < 18.4 ? Math.sin((Math.PI * (h - 6.8)) / 11.6) : 0
  const luz = Math.max(2, Math.min(100, sol * 92 * (1 - 0.55 * ll) + 3 + (r() - 0.5) * 4))
  const pProb = h > 7 && h < 22 ? 0.11 : 0.025
  return { temperatura, humedad, luz, presencia: r() < pProb ? 1 : 0, lluvia: ll }
}

// ---------- historial ----------
const mediciones = []
const alertas = []
const acciones = []
let idMed = 1
let idAlerta = 1
let idAccion = 1

const sensorDe = (idCol, k) => (idCol - 1) * 4 + k // 1 US, 2 DHT, 3 LDR, 4 PIR
const valida = 'valida'

function pushMed(valor, t, id_sensor, id_tipo, calidad = valida) {
  const m = { id_medicion: idMed++, valor: r1(valor), fecha_hora: iso(t), calidad_dato: calidad, id_sensor, id_tipo_variable: id_tipo }
  mediciones.push(m)
  return m
}

for (const c of coladeras) {
  const plan = PLAN[c.id_coladera]
  const ref = c.distancia_referencia_cm
  const umbral = c.umbral_obstruccion_cm
  const fin = AHORA - (plan.cortaHace ?? 0)
  const tiempos = []
  for (let t = fin - Math.floor((fin - INICIO) / PASO) * PASO; t <= fin; t += PASO) tiempos.push(t)

  // Recorremos hacia atrás desde el estado final para obtener la curva de distancia
  const dist = new Array(tiempos.length)
  // Solo una lectura queda bajo el umbral antes de cada limpieza (el rastrillo reacciona en segundos, RNF04)
  let d = plan.fin
  let recienCruzo = plan.fin <= umbral
  for (let i = tiempos.length - 1; i >= 0; i--) {
    dist[i] = d
    const tasa = plan.tasa * (1 + 7 * lluvia(tiempos[i])) * entre(0.8, 1.2)
    d += tasa * (PASO / HORA)
    if (recienCruzo) {
      d = Math.max(d, umbral + entre(0.4, 1.5))
      recienCruzo = false
    }
    if (d >= ref - entre(1, 3)) {
      d = umbral - entre(0.3, 1.2) // justo antes de la limpieza estaba obstruida
      recienCruzo = true
    }
  }

  // Recorremos hacia adelante: mediciones, alertas y limpiezas
  const margen = umbral + (ref - umbral) * 0.4
  let alertaMedia = null
  let alertaAlta = null
  let bloqueos = 0
  for (let i = 0; i < tiempos.length; i++) {
    const t = tiempos[i]
    const cl = clima(t, c.id_coladera)
    let dActual = dist[i] + (rnd() - 0.5) * 0.4
    const siguienteLimpia = i < tiempos.length - 1 && dist[i + 1] - dist[i] > 12
    const esFinal = i === tiempos.length - 1
    if (siguienteLimpia && bloqueos < 1 && c.id_coladera % 2 === 0) cl.presencia = 1
    if (esFinal && plan.presenciaAhora) cl.presencia = 1

    // Lecturas fuera de rango esporádicas (RNF02)
    const invalida = !siguienteLimpia && !esFinal && rnd() < 0.005
    const mDist = invalida
      ? pushMed(rnd() < 0.5 ? entre(390, 450) : -1, t, sensorDe(c.id_coladera, 1), 1, 'fuera_de_rango')
      : pushMed(dActual, t, sensorDe(c.id_coladera, 1), 1)
    pushMed(cl.temperatura, t, sensorDe(c.id_coladera, 2), 2)
    pushMed(cl.humedad, t, sensorDe(c.id_coladera, 2), 3)
    pushMed(cl.luz, t, sensorDe(c.id_coladera, 3), 4)
    const mPir = pushMed(cl.presencia, t, sensorDe(c.id_coladera, 4), 5)

    if (invalida) {
      alertas.push({ id_alerta: idAlerta++, tipo_alerta: 'lectura_invalida', nivel_prioridad: 'baja', estado_alerta: 'descartada', fecha_hora: iso(t + 2000), descripcion: `Lectura del ultrasónico fuera de rango (${mDist.valor} cm). Se excluye de los indicadores.`, id_medicion: mDist.id_medicion })
      continue
    }

    if (dActual <= margen && !alertaMedia && dActual > umbral) {
      alertaMedia = { id_alerta: idAlerta++, tipo_alerta: 'acumulacion_residuos', nivel_prioridad: 'media', estado_alerta: 'activa', fecha_hora: iso(t + 1500), descripcion: `Acumulación de residuos al ${Math.round(((ref - dActual) / ref) * 100)}% (distancia ${r1(dActual)} cm).`, id_medicion: mDist.id_medicion }
      alertas.push(alertaMedia)
    }
    if (dActual <= umbral && !alertaAlta) {
      alertaAlta = { id_alerta: idAlerta++, tipo_alerta: 'obstruccion_critica', nivel_prioridad: 'alta', estado_alerta: 'activa', fecha_hora: iso(t + 1800), descripcion: `Obstrucción crítica: ${r1(dActual)} cm < umbral de ${umbral} cm.`, id_medicion: mDist.id_medicion }
      alertas.push(alertaAlta)
    }

    if (siguienteLimpia || (esFinal && plan.presenciaAhora)) {
      const servo = (c.id_coladera - 1) * 2 + 1
      let tIni = t + entre(4, 9) * 1000
      if (cl.presencia === 1) {
        bloqueos++
        acciones.push({ id_accion: idAccion++, fecha_inicio: iso(tIni), fecha_fin: null, pir_seguro: false, resultado: 'pospuesta_pir', id_actuador: servo, id_alerta: alertaAlta?.id_alerta ?? null })
        if (esFinal) continue
        tIni += entre(3, 8) * MIN
      }
      acciones.push({ id_accion: idAccion++, fecha_inicio: iso(tIni), fecha_fin: iso(tIni + entre(9, 16) * 1000), pir_seguro: true, resultado: rnd() < 0.9 ? 'exitosa' : 'parcial', id_actuador: servo, id_alerta: alertaAlta?.id_alerta ?? null })
      if (alertaAlta) alertaAlta.estado_alerta = 'resuelta'
      if (alertaMedia) alertaMedia.estado_alerta = 'resuelta'
      alertaAlta = null
      alertaMedia = null
    }
  }

  if (plan.cortaHace) {
    const ultima = mediciones.filter((m) => m.id_sensor === sensorDe(c.id_coladera, 1)).at(-1)
    alertas.push({ id_alerta: idAlerta++, tipo_alerta: 'dispositivo_sin_conexion', nivel_prioridad: 'media', estado_alerta: 'activa', fecha_hora: iso(fin + 10 * MIN), descripcion: 'El dispositivo dejó de enviar telemetría. Coladera en mantenimiento.', id_medicion: ultima.id_medicion })
  }
}

// Un par de limpiezas manuales sin alerta previa (id_alerta = NULL)
acciones.push({ id_accion: idAccion++, fecha_inicio: iso(AHORA - 3 * 24 * HORA + 2 * HORA), fecha_fin: iso(AHORA - 3 * 24 * HORA + 2 * HORA + 14000), pir_seguro: true, resultado: 'exitosa', id_actuador: 5, id_alerta: null })

mediciones.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))

export const db = {
  coladera: coladeras,
  dispositivo: dispositivos,
  sensor: sensores,
  tipoVariable: tiposVariable,
  medicion: mediciones,
  actuador: actuadores,
  alerta: alertas,
  accionLimpieza: acciones,
}

// ---------- simulación en vivo ----------
const oyentes = new Set()
const emitir = (tabla, tipo, fila) => oyentes.forEach((fn) => fn({ tabla, tipo, fila }))

const estadoVivo = Object.fromEntries(
  coladeras.map((c) => [c.id_coladera, { dist: PLAN[c.id_coladera].fin, presenciaHasta: PLAN[c.id_coladera].presenciaAhora ? Date.now() + 30_000 : 0 }]),
)
const ACELERACION = 0.2 // cada 5 s reales ≈ 1 min de llenado: se mueve sin exagerar (el simulador sirve para eventos rápidos)
const rndVivo = Math.random

function limpiar(c, servo, alerta) {
  const ahora = Date.now()
  const s = db.actuador.find((a) => a.id_actuador === servo)
  const led = db.actuador.find((a) => a.id_actuador === servo + 1)
  const accion = { id_accion: idAccion++, fecha_inicio: iso(ahora), fecha_fin: null, pir_seguro: true, resultado: 'en_proceso', id_actuador: servo, id_alerta: alerta?.id_alerta ?? null }
  db.accionLimpieza.push(accion)
  emitir('accionLimpieza', 'INSERT', accion)
  Object.assign(s, { estado_actual: 'activo' })
  emitir('actuador', 'UPDATE', s)
  setTimeout(() => {
    Object.assign(accion, { fecha_fin: iso(Date.now()), resultado: 'exitosa' })
    emitir('accionLimpieza', 'UPDATE', accion)
    Object.assign(s, { estado_actual: 'reposo' })
    emitir('actuador', 'UPDATE', s)
    Object.assign(led, { estado_actual: 'apagado' })
    emitir('actuador', 'UPDATE', led)
    estadoVivo[c.id_coladera].dist = c.distancia_referencia_cm - 1.5
    for (const a of db.alerta) {
      const med = db.medicion.find((m) => m.id_medicion === a.id_medicion)
      if (a.estado_alerta === 'activa' && med && Math.ceil(med.id_sensor / 4) === c.id_coladera && a.tipo_alerta !== 'dispositivo_sin_conexion') {
        a.estado_alerta = 'resuelta'
        emitir('alerta', 'UPDATE', a)
      }
    }
  }, 6000)
}

function tick() {
  const t = Date.now()
  for (const c of coladeras) {
    const disp = db.dispositivo.find((d) => d.id_coladera === c.id_coladera)
    if (disp.estado_conexion !== 'en_linea') continue
    const ev = estadoVivo[c.id_coladera]
    const ll = lluvia(t)
    ev.dist -= PLAN[c.id_coladera].tasa * (1 + 7 * ll) * (5 * ACELERACION) / 60 * (0.7 + rndVivo() * 0.6)
    ev.dist = Math.max(4, ev.dist)
    const cl = clima(t, c.id_coladera, rndVivo)
    const presencia = t < ev.presenciaHasta ? 1 : cl.presencia
    const nuevas = [
      pushMed(ev.dist + (rndVivo() - 0.5) * 0.3, t, sensorDe(c.id_coladera, 1), 1),
      pushMed(cl.temperatura, t, sensorDe(c.id_coladera, 2), 2),
      pushMed(cl.humedad, t, sensorDe(c.id_coladera, 2), 3),
      pushMed(cl.luz, t, sensorDe(c.id_coladera, 3), 4),
      pushMed(presencia, t, sensorDe(c.id_coladera, 4), 5),
    ]
    nuevas.forEach((m) => emitir('medicion', 'INSERT', m))

    const ref = c.distancia_referencia_cm
    const umbral = c.umbral_obstruccion_cm
    const margen = umbral + (ref - umbral) * 0.4
    const abiertas = db.alerta.filter((a) => a.estado_alerta === 'activa' && Math.ceil((db.medicion.find((m) => m.id_medicion === a.id_medicion)?.id_sensor ?? 0) / 4) === c.id_coladera)
    const servo = (c.id_coladera - 1) * 2 + 1
    const s = db.actuador.find((a) => a.id_actuador === servo)
    const led = db.actuador.find((a) => a.id_actuador === servo + 1)

    if (ev.dist <= margen && ev.dist > umbral && !abiertas.some((a) => a.tipo_alerta === 'acumulacion_residuos')) {
      const a = { id_alerta: idAlerta++, tipo_alerta: 'acumulacion_residuos', nivel_prioridad: 'media', estado_alerta: 'activa', fecha_hora: iso(t), descripcion: `Acumulación de residuos al ${Math.round(((ref - ev.dist) / ref) * 100)}% (distancia ${r1(ev.dist)} cm).`, id_medicion: nuevas[0].id_medicion }
      db.alerta.push(a)
      emitir('alerta', 'INSERT', a)
      Object.assign(led, { estado_actual: 'ambar' })
      emitir('actuador', 'UPDATE', led)
    }
    if (ev.dist <= umbral) {
      let alta = abiertas.find((a) => a.tipo_alerta === 'obstruccion_critica')
      if (!alta) {
        alta = { id_alerta: idAlerta++, tipo_alerta: 'obstruccion_critica', nivel_prioridad: 'alta', estado_alerta: 'activa', fecha_hora: iso(t), descripcion: `Obstrucción crítica: ${r1(ev.dist)} cm < umbral de ${umbral} cm.`, id_medicion: nuevas[0].id_medicion }
        db.alerta.push(alta)
        emitir('alerta', 'INSERT', alta)
        Object.assign(led, { estado_actual: 'rojo' })
        emitir('actuador', 'UPDATE', led)
      }
      if (s.estado_actual !== 'activo') {
        if (presencia) {
          const yaPospuesta = db.accionLimpieza.some((a) => a.id_actuador === servo && a.resultado === 'pospuesta_pir' && t - new Date(a.fecha_inicio) < 20_000)
          if (!yaPospuesta) {
            const a = { id_accion: idAccion++, fecha_inicio: iso(t), fecha_fin: null, pir_seguro: false, resultado: 'pospuesta_pir', id_actuador: servo, id_alerta: alta.id_alerta }
            db.accionLimpieza.push(a)
            emitir('accionLimpieza', 'INSERT', a)
          }
          if (s.estado_actual !== 'en_espera') {
            Object.assign(s, { estado_actual: 'en_espera' })
            emitir('actuador', 'UPDATE', s)
          }
        } else {
          limpiar(c, servo, alta)
        }
      }
    }
  }
}

let intervalo = null
export function suscribirDemo(fn) {
  oyentes.add(fn)
  if (!intervalo) intervalo = setInterval(tick, 5000)
  return () => {
    oyentes.delete(fn)
    if (!oyentes.size) {
      clearInterval(intervalo)
      intervalo = null
    }
  }
}

/** Controles para presentar la demo. */
export const simulador = {
  obstruir(idColadera) {
    const c = coladeras.find((x) => x.id_coladera === idColadera)
    estadoVivo[idColadera].dist = c.umbral_obstruccion_cm - 0.8
    tick()
  },
  personaCerca(idColadera, segundos = 20) {
    estadoVivo[idColadera].presenciaHasta = Date.now() + segundos * 1000
    tick()
  },
  lluvia(intensidad) {
    lluviaForzada = intensidad
  },
  get lluviaActual() {
    return lluvia(Date.now())
  },
}
