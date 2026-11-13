import { Ruler, Thermometer, Droplets, Sun, PersonStanding, Activity } from 'lucide-react'
import { clamp, norm } from './format'

/**
 * Reconoce el tipo de variable a partir de TipoVariable.nombre_variable
 * (funciona con "Distancia", "distancia_cm", "Temperatura", etc.).
 */
export function claveVariable(nombre) {
  const n = norm(nombre)
  if (n.includes('dist') || n.includes('nivel') || n.includes('basura')) return 'distancia'
  if (n.includes('temp')) return 'temperatura'
  if (n.includes('hum')) return 'humedad'
  if (n.includes('luz') || n.includes('lum') || n.includes('ldr')) return 'luz'
  if (n.includes('pres') || n.includes('mov') || n.includes('pir')) return 'presencia'
  return n || 'otra'
}

export const VARIABLES = {
  distancia: { titulo: 'Distancia a residuos', corto: 'Distancia', icono: Ruler, color: 'var(--c-distancia)', sensor: 'Ultrasónico JSN-SR04T' },
  temperatura: { titulo: 'Temperatura', corto: 'Temp.', icono: Thermometer, color: 'var(--c-temperatura)', sensor: 'DHT22' },
  humedad: { titulo: 'Humedad relativa', corto: 'Humedad', icono: Droplets, color: 'var(--c-humedad)', sensor: 'DHT22' },
  luz: { titulo: 'Luz ambiental', corto: 'Luz', icono: Sun, color: 'var(--c-luz)', sensor: 'LDR' },
  presencia: { titulo: 'Presencia (PIR)', corto: 'PIR', icono: PersonStanding, color: 'var(--c-presencia)', sensor: 'PIR HC-SR501' },
}

export const infoVariable = (clave) =>
  VARIABLES[clave] ?? { titulo: clave, corto: clave, icono: Activity, color: 'var(--accent)', sensor: '—' }

/**
 * Atributo derivado del modelo: porcentaje de obstrucción.
 * El ultrasónico mide la distancia hasta la basura: rejilla limpia = distancia_referencia_cm,
 * mientras más basura, menor distancia.
 */
export function porcentajeObstruccion(distancia, referencia) {
  if (distancia == null || !referencia) return null
  return clamp(((referencia - distancia) / referencia) * 100, 0, 100)
}

/** Nivel de riesgo: crítico al rebasar el umbral (RF04: < 10 cm), precaución cuando se acerca. */
export function nivelRiesgo(distancia, referencia, umbral) {
  if (distancia == null) return 'sin-datos'
  if (distancia <= umbral) return 'critico'
  const margen = umbral + (referencia - umbral) * 0.4
  if (distancia <= margen) return 'precaucion'
  return 'normal'
}

export const RIESGO = {
  critico: { texto: 'Crítico', tono: 'crit' },
  precaucion: { texto: 'Precaución', tono: 'warn' },
  normal: { texto: 'Normal', tono: 'ok' },
  'sin-datos': { texto: 'Sin señal', tono: 'muted' },
}

export const ordenRiesgo = { critico: 0, precaucion: 1, normal: 2, 'sin-datos': 3 }

export function tonoPrioridad(p) {
  const n = norm(p)
  if (n.includes('alta') || n.includes('crit')) return 'crit'
  if (n.includes('media')) return 'warn'
  return 'info'
}

/** Texto legible del valor según la variable. */
export function valorLegible(clave, valor) {
  if (valor == null) return '—'
  const v = Number(valor)
  switch (clave) {
    case 'presencia':
      return v >= 1 ? 'Detectada' : 'Libre'
    default:
      return Number.isInteger(v) ? String(v) : v.toFixed(1)
  }
}

/** Día/noche a partir del LDR. Si la unidad es % usa 35 %, si es lectura analógica (0-1023) usa 350. */
export const esDeDia = (luz, unidad = '%') => {
  if (luz == null) return null
  const umbral = String(unidad).includes('%') ? 35 : 350
  return Number(luz) >= umbral
}
