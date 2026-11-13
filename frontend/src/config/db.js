/**
 * Configuración de la base de datos (Supabase).
 *
 * ⚠️ Confirma con quien creó la base de datos cómo se llaman EXACTAMENTE las tablas.
 * Si las crearon con el SQL que exporta dbdiagram.io se llaman con mayúscula ("Coladera");
 * si las crearon desde el editor de Supabase suelen ir en minúscula ("coladera").
 * Solo cambia los valores de la derecha; el resto de la app usa estos nombres.
 */
export const TABLAS = {
  coladera: 'Coladera',
  dispositivo: 'Dispositivo',
  sensor: 'Sensor',
  tipoVariable: 'TipoVariable',
  medicion: 'Medicion',
  actuador: 'Actuador',
  alerta: 'Alerta',
  accionLimpieza: 'AccionLimpieza',
}

/** Valores de texto que el frontend reconoce (se comparan sin acentos ni mayúsculas). */
export const VALORES = {
  // Medicion.calidad_dato → cualquier valor de esta lista cuenta como lectura válida (RNF02)
  calidadValida: ['valida', 'valido', 'ok', 'correcta', 'buena'],
  // Alerta.estado_alerta → estos estados se consideran "abiertos"
  alertaAbierta: ['activa', 'pendiente', 'abierta', 'nueva'],
  // AccionLimpieza.resultado → estos resultados se consideran éxito
  limpiezaExitosa: ['exitosa', 'exitoso', 'completada', 'ok'],
  // Dispositivo.estado_conexion
  conectado: ['en linea', 'en_linea', 'online', 'conectado', 'activo'],
}

/** Cada cuánto se vuelven a pedir datos si Realtime no está disponible (ms). */
export const INTERVALO_REFRESCO_MS = 15000

/** Cuántas horas de mediciones se cargan para las gráficas del panel. */
export const HORAS_HISTORIAL = 24
