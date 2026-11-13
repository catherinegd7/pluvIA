import { VALORES } from '../config/db'
import { enLista } from './format'

/** RNF02: ¿la medición es válida? (las inválidas no cuentan en indicadores) */
export const esValida = (m) => enLista(m?.calidad_dato, VALORES.calidadValida)

/** ¿La alerta sigue abierta? */
export const alertaAbierta = (a) => enLista(a?.estado_alerta, VALORES.alertaAbierta)

/** ¿La limpieza terminó con éxito? */
export const limpiezaExitosa = (l) => enLista(l?.resultado, VALORES.limpiezaExitosa)
