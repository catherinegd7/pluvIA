/** Quita acentos y pasa a minúsculas para comparar textos que vienen de la BD. */
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const enLista = (valor, lista) => lista.includes(norm(valor).replace(/_/g, ' ')) || lista.includes(norm(valor))

/**
 * Convierte lo que regresa Supabase a Date. Si la columna es TIMESTAMP sin zona horaria,
 * Postgres guarda la hora en UTC pero la regresa sin la "Z"; se la agregamos para que
 * el navegador la muestre en hora de Monterrey.
 */
export function aFecha(f) {
  if (f == null) return null
  if (f instanceof Date) return f
  if (typeof f === 'number') return new Date(f)
  const s = String(f)
  const tieneZona = /([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(s)
  return new Date(tieneZona || s.length <= 10 ? s : s.replace(' ', 'T') + 'Z')
}
export const ms = (f) => aFecha(f)?.getTime() ?? 0

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

export function haceCuanto(fecha) {
  if (!fecha) return '—'
  const diff = (ms(fecha) - Date.now()) / 1000
  if (!Number.isFinite(diff)) return '—'
  const abs = Math.abs(diff)
  if (abs < 45) return 'justo ahora'
  const signo = Math.sign(diff)
  const min = Math.round(abs / 60)
  if (min < 60) return rtf.format(signo * min, 'minute')
  const horas = Math.round(abs / 3600)
  if (horas < 24) return rtf.format(signo * horas, 'hour')
  return rtf.format(signo * Math.round(abs / 86400), 'day')
}

export const fechaHora = (f) =>
  f
    ? aFecha(f).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export const hora = (f) =>
  f ? aFecha(f).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'

export const numero = (n, dec = 1) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('es-MX', { maximumFractionDigits: dec, minimumFractionDigits: 0 })

export function duracion(inicio, fin) {
  if (!inicio || !fin) return '—'
  const s = Math.round((ms(fin) - ms(inicio)) / 1000)
  if (s < 60) return `${s} s`
  return `${Math.floor(s / 60)} min ${s % 60} s`
}

/** Convierte "en_linea" → "En línea" para mostrar valores de la BD bonitos. */
const ETIQUETAS = {
  obstruccion_critica: 'Obstrucción crítica',
  acumulacion_residuos: 'Acumulación de residuos',
  dispositivo_sin_conexion: 'Dispositivo sin conexión',
  lectura_invalida: 'Lectura inválida',
  en_linea: 'En línea',
  pospuesta_pir: 'Pospuesta por PIR',
  en_proceso: 'En proceso',
  en_espera: 'En espera',
  ambar: 'Ámbar',
  fuera_de_rango: 'Fuera de rango',
  valida: 'Válida',
  sin_respuesta: 'Sin respuesta',
}

export function etiqueta(valor) {
  if (valor == null || valor === '') return '—'
  const conocida = ETIQUETAS[norm(valor).replace(/\s+/g, '_')]
  if (conocida) return conocida
  const t = String(valor).replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function descargarCSV(nombre, filas, columnas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [columnas.map((c) => esc(c.titulo)).join(','), ...filas.map((f) => columnas.map((c) => esc(c.valor(f))).join(','))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
