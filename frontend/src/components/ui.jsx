import { useEffect, useState } from 'react'
import { CircleAlert, Inbox, Moon, RefreshCw, Sun } from 'lucide-react'
import { RIESGO } from '../utils/dominio'
import { haceCuanto, ms } from '../utils/format'
import { useDatos } from '../services/useDatos'

export function Badge({ tono = 'muted', punto = false, children, className = '' }) {
  return (
    <span className={`badge badge-${tono} ${className}`}>
      {punto && <span className="badge-punto" />}
      {children}
    </span>
  )
}

export function RiesgoBadge({ riesgo }) {
  const r = RIESGO[riesgo] ?? RIESGO['sin-datos']
  return (
    <Badge tono={r.tono} punto>
      {r.texto}
    </Badge>
  )
}

/** Re-renderiza cada `cada` ms para que los "hace X min" se mantengan al día. */
export function useAhora(cada = 15000) {
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cada)
    return () => clearInterval(id)
  }, [cada])
  return ahora
}

export function EnVivo({ compacto = false }) {
  const { tiempoReal, actualizado, modo } = useDatos()
  useAhora(5000)
  const ok = tiempoReal === 'conectado'
  return (
    <div className={`envivo ${ok ? 'ok' : 'off'}`} title={modo === 'demo' ? 'Simulación de telemetría en vivo' : 'Supabase Realtime'}>
      <span className="envivo-punto" />
      <span>{ok ? 'En vivo' : tiempoReal === 'error' ? 'Sin tiempo real' : 'Conectando…'}</span>
      {!compacto && actualizado && <span className="envivo-t">· {haceCuanto(actualizado)}</span>}
    </div>
  )
}

export function Kpi({ titulo, valor, unidad, detalle, tono = 'neutro', children }) {
  return (
    <div className={`kpi kpi-${tono}`}>
      <div className="kpi-head">
        <span className="kpi-senal" />
        <span className="kpi-titulo">{titulo}</span>
      </div>
      <div className="kpi-valor num">
        {valor}
        {unidad && <span className="kpi-unidad">{unidad}</span>}
      </div>
      {detalle && <div className="kpi-detalle">{detalle}</div>}
      {children}
    </div>
  )
}

/** Medidor de nivel segmentado (como un indicador de tanque): % de obstrucción. */
export function Medidor({ pct, riesgo, umbralPct, segmentos = 20, grande = false, escala = false }) {
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const llenos = Math.round((v / 100) * segmentos)
  const tono = RIESGO[riesgo]?.tono ?? 'muted'
  return (
    <div className={`medidor tono-${tono} ${grande ? 'grande' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label="Obstrucción">
      <div className="medidor-barra" style={{ '--segmentos': segmentos }}>
        {Array.from({ length: segmentos }, (_, i) => {
          // zona del segmento: precaución empieza al 60 % del camino hacia el umbral (igual que nivelRiesgo)
          const pos = ((i + 0.5) / segmentos) * 100
          const zona = umbralPct == null ? '' : pos >= umbralPct ? 'z-crit' : pos >= umbralPct * 0.6 ? 'z-warn' : 'z-ok'
          return <i key={i} className={`${i < llenos ? 'lleno' : ''} ${zona}`} />
        })}
        {umbralPct != null && <span className="medidor-umbral" style={{ left: `${umbralPct}%` }} title="Umbral crítico" />}
      </div>
      {escala && (
        <div className="medidor-escala">
          <span>0 % · limpia</span>
          {umbralPct != null && (
            <span className="umbral-txt" style={{ left: `${umbralPct}%` }}>
              umbral
            </span>
          )}
          <span>100 %</span>
        </div>
      )}
    </div>
  )
}

/** Mini gráfica (sin librería) para las tarjetas. */
export function Sparkline({ valores, alto = 36, ancho = 140, color = 'var(--accent)', min, max, linea }) {
  if (!valores?.length) return <div className="spark-vacio" style={{ height: alto }} />
  const lo = min ?? Math.min(...valores)
  const hi = max ?? Math.max(...valores)
  const rango = hi - lo || 1
  const pts = valores.map((v, i) => [(i / Math.max(1, valores.length - 1)) * ancho, alto - 2 - ((v - lo) / rango) * (alto - 4)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const yLinea = linea != null ? alto - 2 - ((linea - lo) / rango) * (alto - 4) : null
  return (
    <svg className="spark" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" style={{ height: alto }}>
      <path d={`${d} L ${ancho} ${alto} L 0 ${alto} Z`} fill={color} opacity="0.12" />
      {yLinea != null && <line x1="0" x2={ancho} y1={yLinea} y2={yLinea} stroke="var(--crit-fill)" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity=".7" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

export function Vacio({ icono: Icono = Inbox, titulo, texto, children }) {
  return (
    <div className="vacio">
      <span className="vacio-icono">
        <Icono size={20} />
      </span>
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}

export function Esqueleto({ alto = 16, ancho = '100%', r = 8 }) {
  return <span className="esqueleto" style={{ height: alto, width: ancho, borderRadius: r }} />
}

export function ErrorDatos() {
  const { error, recargar } = useDatos()
  if (!error) return null
  return (
    <div className="aviso aviso-crit" role="alert">
      <CircleAlert size={18} />
      <div>
        <strong>No se pudo leer la base de datos.</strong>
        <p>
          {error}. Revisa el archivo <code>.env</code>, los nombres de tablas en <code>src/config/db.js</code> y que las políticas RLS de Supabase permitan
          leer con la anon key.
        </p>
      </div>
      <button className="btn btn-sm" onClick={recargar}>
        <RefreshCw size={14} /> Reintentar
      </button>
    </div>
  )
}

export function TemaToggle({ claro = false }) {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    try {
      localStorage.setItem('pluvia-tema', tema)
    } catch {
      /* almacenamiento no disponible */
    }
  }, [tema])
  const oscuro = tema === 'dark'
  return (
    <button className={`btn-icono ${claro ? 'btn-icono-claro' : ''}`} onClick={() => setTema(oscuro ? 'light' : 'dark')} aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title={oscuro ? 'Tema claro' : 'Tema oscuro'}>
      {oscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export function Segmentado({ opciones, valor, onChange, etiqueta }) {
  return (
    <div className="seg" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} role="radio" aria-checked={valor === o.valor} className={valor === o.valor ? 'activo' : ''} onClick={() => onChange(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export function Encabezado({ titulo, subtitulo, children, migas, etiqueta }) {
  return (
    <header className="encabezado">
      <div>
        {migas && <div className="migas">{migas}</div>}
        {etiqueta && !migas && <div className="encabezado-meta">{etiqueta}</div>}
        <h1>{titulo}</h1>
        {subtitulo && <p className="encabezado-sub">{subtitulo}</p>}
      </div>
      {children && <div className="encabezado-acciones">{children}</div>}
    </header>
  )
}

export const ordenarFecha = (campo) => (a, b) => ms(b[campo]) - ms(a[campo])
