import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import * as api from './api'
import { HORAS_HISTORIAL, INTERVALO_REFRESCO_MS, VALORES } from '../config/db'
import { DatosCtx } from './useDatos'
import { alertaAbierta, esValida } from '../utils/reglas'
import { claveVariable, nivelRiesgo, porcentajeObstruccion } from '../utils/dominio'
import { enLista, ms, norm } from '../utils/format'

const HORA = 3_600_000
const LECTURAS_POR_SENSOR = 8

const inicial = {
  cargando: true,
  error: null,
  catalogo: { coladeras: [], dispositivos: [], sensores: [], actuadores: [], tipos: [] },
  ultimas: {}, // id_sensor → mediciones recientes (más nueva primero)
  distancias: {}, // id_coladera → serie de distancia (más vieja primero)
  alertas: [],
  limpiezas: [],
  medAlertas: {}, // id_medicion → medicion que originó cada alerta
  actualizado: null,
}

const upsert = (lista, fila, id) => {
  const i = lista.findIndex((x) => x[id] === fila[id])
  if (i === -1) return [fila, ...lista]
  const copia = lista.slice()
  copia[i] = { ...copia[i], ...fila }
  return copia
}

function reducer(s, a) {
  switch (a.tipo) {
    case 'cargado':
      return { ...s, ...a.datos, cargando: false, error: null, actualizado: Date.now() }
    case 'error':
      return { ...s, cargando: false, error: a.error }
    case 'medicion': {
      const m = a.fila
      const prev = s.ultimas[m.id_sensor] ?? []
      const ultimas = { ...s.ultimas, [m.id_sensor]: [m, ...prev].slice(0, LECTURAS_POR_SENSOR) }
      let distancias = s.distancias
      if (a.idColaderaDist) {
        const corte = Date.now() - HORAS_HISTORIAL * HORA
        const serie = [...(s.distancias[a.idColaderaDist] ?? []), m].filter((x) => ms(x.fecha_hora) >= corte)
        distancias = { ...s.distancias, [a.idColaderaDist]: serie }
      }
      return { ...s, ultimas, distancias, actualizado: Date.now() }
    }
    case 'alerta': {
      const medAlertas = a.medicion ? { ...s.medAlertas, [a.medicion.id_medicion]: a.medicion } : s.medAlertas
      return { ...s, alertas: upsert(s.alertas, a.fila, 'id_alerta'), medAlertas, actualizado: Date.now() }
    }
    case 'accionLimpieza':
      return { ...s, limpiezas: upsert(s.limpiezas, a.fila, 'id_accion'), actualizado: Date.now() }
    case 'catalogo': {
      const { lista, id } = { actuador: { lista: 'actuadores', id: 'id_actuador' }, dispositivo: { lista: 'dispositivos', id: 'id_dispositivo' }, coladera: { lista: 'coladeras', id: 'id_coladera' } }[a.tabla]
      return { ...s, catalogo: { ...s.catalogo, [lista]: upsert(s.catalogo[lista], a.fila, id) }, actualizado: Date.now() }
    }
    default:
      return s
  }
}

/** ¿Este sensor es el ultrasónico que mide la distancia a la basura? */
const esUltrasonico = (sensor) => {
  const t = norm(`${sensor.tipo_sensor} ${sensor.modelo}`)
  return t.includes('ultra') || t.includes('dist') || t.includes('sr04')
}

export function DatosProvider({ children }) {
  const [s, dispatch] = useReducer(reducer, inicial)
  const [tiempoReal, setTiempoReal] = useState('conectando')
  const ref = useRef(s)
  ref.current = s

  const cargar = useCallback(async () => {
    try {
      const catalogo = await api.cargarCatalogo()
      const desdeHist = new Date(Date.now() - HORAS_HISTORIAL * HORA).toISOString()
      const desde7d = new Date(Date.now() - 7 * 24 * HORA).toISOString()
      const tipoDist = catalogo.tipos.find((t) => claveVariable(t.nombre_variable) === 'distancia')
      const ultras = catalogo.sensores.filter(esUltrasonico)
      const colDeSensor = indiceSensorColadera(catalogo)

      const [porSensor, series, alertas, limpiezas] = await Promise.all([
        Promise.all(catalogo.sensores.map((x) => api.ultimasDeSensor(x.id_sensor, LECTURAS_POR_SENSOR))),
        Promise.all(ultras.map((x) => api.serie({ idSensores: [x.id_sensor], idTipo: tipoDist?.id_tipo_variable, desde: desdeHist, limite: 600 }))),
        api.cargarAlertas({ desde: desde7d }),
        api.cargarLimpiezas({ desde: desde7d }),
      ])
      const ultimas = Object.fromEntries(catalogo.sensores.map((x, i) => [x.id_sensor, porSensor[i]]))
      const distancias = {}
      ultras.forEach((x, i) => {
        const col = colDeSensor[x.id_sensor]
        if (col != null) distancias[col] = [...(distancias[col] ?? []), ...series[i]].sort((a, b) => ms(a.fecha_hora) - ms(b.fecha_hora))
      })
      const meds = await api.medicionesPorId([...new Set(alertas.map((a) => a.id_medicion))].slice(0, 300))
      const medAlertas = Object.fromEntries(meds.map((m) => [m.id_medicion, m]))
      dispatch({ tipo: 'cargado', datos: { catalogo, ultimas, distancias, alertas, limpiezas, medAlertas } })
    } catch (e) {
      console.error(e)
      dispatch({ tipo: 'error', error: e.message ?? String(e) })
    }
  }, [])

  // Carga inicial + tiempo real
  useEffect(() => {
    cargar()
    const cancelar = api.suscribirse(async ({ tabla, tipo, fila }) => {
      const st = ref.current
      if (tabla === 'medicion' && tipo === 'INSERT') {
        const sensor = st.catalogo.sensores.find((x) => x.id_sensor === fila.id_sensor)
        const tipoVar = st.catalogo.tipos.find((t) => t.id_tipo_variable === fila.id_tipo_variable)
        const esDist = sensor && esUltrasonico(sensor) && claveVariable(tipoVar?.nombre_variable) === 'distancia'
        dispatch({ tipo: 'medicion', fila, idColaderaDist: esDist ? indiceSensorColadera(st.catalogo)[fila.id_sensor] : null })
      } else if (tabla === 'alerta') {
        let medicion = st.medAlertas[fila.id_medicion] ?? Object.values(st.ultimas).flat().find((m) => m.id_medicion === fila.id_medicion)
        if (!medicion && fila.id_medicion) medicion = (await api.medicionesPorId([fila.id_medicion]))[0]
        dispatch({ tipo: 'alerta', fila, medicion })
      } else if (tabla === 'accionLimpieza') {
        dispatch({ tipo: 'accionLimpieza', fila })
      } else if (['actuador', 'dispositivo', 'coladera'].includes(tabla) && fila) {
        dispatch({ tipo: 'catalogo', tabla, fila })
      }
    }, setTiempoReal)
    return cancelar
  }, [cargar])

  // Respaldo: si Realtime no está activo en Supabase, refrescamos cada cierto tiempo
  useEffect(() => {
    if (api.MODO !== 'supabase') return
    const id = setInterval(cargar, tiempoReal === 'conectado' ? INTERVALO_REFRESCO_MS * 4 : INTERVALO_REFRESCO_MS)
    return () => clearInterval(id)
  }, [cargar, tiempoReal])

  const derivados = useMemo(() => derivar(s), [s])

  const valor = useMemo(
    () => ({ ...s, ...derivados, recargar: cargar, tiempoReal, modo: api.MODO }),
    [s, derivados, cargar, tiempoReal],
  )
  return <DatosCtx.Provider value={valor}>{children}</DatosCtx.Provider>
}

// ------------------------------------------------------------------
function indiceSensorColadera({ sensores, dispositivos }) {
  const colDeDisp = Object.fromEntries(dispositivos.map((d) => [d.id_dispositivo, d.id_coladera]))
  return Object.fromEntries(sensores.map((x) => [x.id_sensor, colDeDisp[x.id_dispositivo]]))
}


function derivar(s) {
  const { coladeras, dispositivos, sensores, actuadores, tipos } = s.catalogo
  const tipoPorId = Object.fromEntries(tipos.map((t) => [t.id_tipo_variable, t]))
  const claveTipo = (id) => claveVariable(tipoPorId[id]?.nombre_variable)
  const colDeSensor = indiceSensorColadera(s.catalogo)
  const colDeDisp = Object.fromEntries(dispositivos.map((d) => [d.id_dispositivo, d.id_coladera]))
  const colDeActuador = Object.fromEntries(actuadores.map((a) => [a.id_actuador, colDeDisp[a.id_dispositivo]]))
  const colDeAlerta = (a) => colDeSensor[s.medAlertas[a.id_medicion]?.id_sensor]
  const ahora = Date.now()

  const estado = coladeras.map((c) => {
    const disp = dispositivos.filter((d) => d.id_coladera === c.id_coladera)
    const idsDisp = disp.map((d) => d.id_dispositivo)
    const sens = sensores.filter((x) => idsDisp.includes(x.id_dispositivo))
    const acts = actuadores.filter((x) => idsDisp.includes(x.id_dispositivo))

    const lecturas = {}
    const invalidas = {}
    for (const x of sens) {
      for (const m of s.ultimas[x.id_sensor] ?? []) {
        const k = claveTipo(m.id_tipo_variable)
        if (!esValida(m)) {
          if (!lecturas[k] && !invalidas[k]) invalidas[k] = m
          continue
        }
        if (!lecturas[k] || ms(m.fecha_hora) > ms(lecturas[k].fecha_hora)) lecturas[k] = { ...m, unidad: tipoPorId[m.id_tipo_variable]?.unidad_medida }
      }
    }
    const ref = Number(c.distancia_referencia_cm)
    const umbral = Number(c.umbral_obstruccion_cm)
    const dist = lecturas.distancia ? Number(lecturas.distancia.valor) : null
    const ultimaLectura = Math.max(0, ...Object.values(lecturas).map((m) => ms(m.fecha_hora)))
    const sinSenal = !ultimaLectura || ahora - ultimaLectura > 30 * 60_000
    const servo = acts.find((a) => norm(a.tipo_actuador).includes('servo'))
    const led = acts.find((a) => norm(a.tipo_actuador).includes('led'))
    const limpiezasCol = s.limpiezas.filter((l) => colDeActuador[l.id_actuador] === c.id_coladera)
    const enCurso = limpiezasCol.find((l) => !l.fecha_fin && l.pir_seguro && ahora - ms(l.fecha_inicio) < 60_000)

    return {
      ...c,
      dispositivos: disp,
      sensores: sens,
      actuadores: acts,
      servo,
      led,
      lecturas,
      invalidas,
      distancia: dist,
      obstruccion: porcentajeObstruccion(dist, ref),
      riesgo: sinSenal ? 'sin-datos' : nivelRiesgo(dist, ref, umbral),
      riesgoUltimo: nivelRiesgo(dist, ref, umbral), // con el último dato conocido aunque no haya señal
      conectado: disp.some((d) => enLista(d.estado_conexion, VALORES.conectado)),
      sinSenal,
      ultimaLectura: ultimaLectura || null,
      presencia: lecturas.presencia ? Number(lecturas.presencia.valor) >= 1 : null,
      limpiando: Boolean(enCurso) || norm(servo?.estado_actual) === 'activo',
      alertasAbiertas: s.alertas.filter((a) => alertaAbierta(a) && colDeAlerta(a) === c.id_coladera),
      limpiezas: limpiezasCol,
      serieDistancia: s.distancias[c.id_coladera] ?? [],
      pronostico: pronosticar(s.distancias[c.id_coladera] ?? [], dist, umbral, ref),
    }
  })

  return {
    estado,
    tipoPorId,
    claveTipo,
    colDeSensor,
    colDeActuador,
    colDeAlerta,
    coladeraPorId: Object.fromEntries(estado.map((c) => [c.id_coladera, c])),
  }
}

/**
 * Pronóstico simple (regresión lineal) de cuándo la basura llegará al umbral crítico,
 * usando las lecturas válidas de las últimas 3 h posteriores a la última limpieza.
 */
function pronosticar(serie, dist, umbral, ref) {
  if (dist == null) return null
  if (dist <= umbral) return { estado: 'critico' }
  const corte = Date.now() - 3 * HORA
  let pts = serie.filter((m) => esValida(m) && ms(m.fecha_hora) >= corte).map((m) => [ms(m.fecha_hora) / HORA, Number(m.valor)])
  pts = pts.filter(([, v]) => v >= 0 && v <= ref * 1.2)
  for (let i = pts.length - 1; i > 0; i--) {
    if (pts[i][1] - pts[i - 1][1] > 8) {
      pts = pts.slice(i)
      break
    }
  }
  if (pts.length < 4) return null
  const n = pts.length
  const mx = pts.reduce((a, p) => a + p[0], 0) / n
  const my = pts.reduce((a, p) => a + p[1], 0) / n
  const num = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0)
  const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0)
  const pendiente = den ? num / den : 0 // cm por hora (negativa = se está llenando)
  if (pendiente > -0.05) return { estado: 'estable', pendiente }
  const horas = (dist - umbral) / -pendiente
  return { estado: 'llenando', pendiente, horas }
}
