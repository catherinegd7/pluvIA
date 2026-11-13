import { fechaHora, hora, numero } from '../utils/format'

export const PALETA = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)', 'var(--serie-5)', 'var(--serie-6)']

export const ejeProps = {
  stroke: 'var(--ink-3)',
  fontSize: 10.5,
  tickLine: false,
  axisLine: false,
}

export function TooltipPluvia({ active, payload, label, unidad = '', formatoX = 'hora', nombres }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      <div className="tooltip-t">{formatoX === 'hora' ? fechaHora(label) : label}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.dataKey} className="tooltip-fila">
            <span>
              <i style={{ background: p.color || p.stroke || p.fill }} />
              {nombres?.[p.dataKey] ?? p.name}
            </span>
            <b>
              {numero(p.value)}
              {p.unit ?? unidad}
            </b>
          </div>
        ))}
    </div>
  )
}

export const tickHora = (t) => hora(t)
export const tickDia = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })

/** Una marca por día (a medianoche) para gráficas de varios días. */
export function ticksDiarios(filas) {
  if (!filas.length) return undefined
  const ini = new Date(filas[0].t)
  ini.setHours(24, 0, 0, 0)
  const fin = filas.at(-1).t
  const out = []
  for (let t = ini.getTime(); t <= fin; t += 86_400_000) out.push(t)
  return out
}

/** Agrupa puntos en cubetas de tiempo (promedio) para unir varias series en una gráfica. */
export function agrupar(series, cubetaMs) {
  const mapa = new Map()
  for (const [clave, puntos] of Object.entries(series)) {
    for (const [t, v] of puntos) {
      const b = Math.floor(t / cubetaMs) * cubetaMs
      if (!mapa.has(b)) mapa.set(b, { t: b })
      const fila = mapa.get(b)
      fila[`_${clave}`] = (fila[`_${clave}`] ?? 0) + 1
      fila[clave] = ((fila[clave] ?? 0) * (fila[`_${clave}`] - 1) + v) / fila[`_${clave}`]
    }
  }
  return [...mapa.values()].sort((a, b) => a.t - b.t)
}
