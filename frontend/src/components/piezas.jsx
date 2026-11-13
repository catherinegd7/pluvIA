import { Link } from 'react-router-dom'
import { BellRing, Brush, ChevronRight, CircleCheck, CircleX, Clock, Hourglass, ShieldAlert, ShieldCheck, TriangleAlert, Info, WifiOff } from 'lucide-react'
import { Badge, Medidor, RiesgoBadge, Sparkline } from './ui'
import { tonoPrioridad, valorLegible } from '../utils/dominio'
import { duracion, etiqueta, fechaHora, haceCuanto, norm, numero } from '../utils/format'
import { alertaAbierta, limpiezaExitosa } from '../utils/reglas'

export function ColaderaCard({ c }) {
  const vals = c.serieDistancia.map((m) => Number(m.valor)).filter((v) => v >= 0 && v <= c.distancia_referencia_cm * 1.2)
  const pctSerie = vals.map((v) => Math.max(0, Math.min(100, ((c.distancia_referencia_cm - v) / c.distancia_referencia_cm) * 100)))
  const umbralPct = ((c.distancia_referencia_cm - c.umbral_obstruccion_cm) / c.distancia_referencia_cm) * 100

  return (
    <Link to={`/panel/coladeras/${c.id_coladera}`} className={`card col-card riesgo-${c.riesgo}`}>
      <div className="col-card-top">
        <span className="col-tag">{c.codigo}</span>
        <RiesgoBadge riesgo={c.riesgo} />
      </div>
      <div className="col-calle">{c.calle}</div>
      <div className="col-colonia">
        {c.colonia}, {c.municipio}
      </div>

      <div className="col-nivel">
        <span className="col-pct num">
          {c.obstruccion == null ? '—' : Math.round(c.obstruccion)}
          <small>%</small>
        </span>
        <span className="etiqueta-mono">obstrucción</span>
      </div>
      <Medidor pct={c.obstruccion} riesgo={c.riesgo} umbralPct={umbralPct} />

      <dl className="col-lecturas">
        {[
          ['distancia', 'Dist.'],
          ['temperatura', 'Temp.'],
          ['humedad', 'Hum.'],
        ].map(([k, corto]) => {
          const m = c.lecturas[k]
          return (
            <div key={k} className="col-lectura">
              <dt>{corto}</dt>
              <dd className="num">
                {m ? valorLegible(k, m.valor) : '—'}
                <small>{m?.unidad}</small>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="col-spark">
        <Sparkline valores={pctSerie} min={0} max={100} linea={umbralPct} color={c.riesgo === 'sin-datos' ? 'var(--muted)' : 'var(--accent)'} ancho={260} alto={30} />
        <span className="col-spark-txt">Obstrucción · últimas 24 h</span>
      </div>

      <div className="col-card-pie">
        {c.limpiando ? (
          <span className="col-estado limpiando">
            <Brush size={13} /> Limpiando ahora…
          </span>
        ) : c.alertasAbiertas.length ? (
          <span className="col-estado alerta">
            <BellRing size={13} /> {c.alertasAbiertas.length} alerta{c.alertasAbiertas.length > 1 ? 's' : ''} activa{c.alertasAbiertas.length > 1 ? 's' : ''}
          </span>
        ) : !c.conectado ? (
          <span className="col-estado off">
            <WifiOff size={13} /> Dispositivo desconectado
          </span>
        ) : c.pronostico?.estado === 'llenando' && c.pronostico.horas < 12 ? (
          <span className="col-estado pronostico">
            <Hourglass size={13} /> Crítica en ~{c.pronostico.horas < 1 ? `${Math.max(1, Math.round(c.pronostico.horas * 60))} min` : `${Math.round(c.pronostico.horas)} h`}
          </span>
        ) : (
          <span className="col-estado">
            <Clock size={13} /> {haceCuanto(c.ultimaLectura)}
          </span>
        )}
        <ChevronRight size={16} className="col-flecha" />
      </div>
    </Link>
  )
}

const ICONO_ALERTA = { crit: TriangleAlert, warn: BellRing, info: Info }

export function AlertaItem({ a, coladera, medicion, compacto = false }) {
  const tono = tonoPrioridad(a.nivel_prioridad)
  const Icono = ICONO_ALERTA[tono] ?? Info
  const abierta = alertaAbierta(a)
  return (
    <div className={`alerta-item ${abierta ? 'abierta' : ''}`}>
      <span className={`alerta-icono tono-${tono}`}>
        <Icono size={16} />
      </span>
      <div className="alerta-cuerpo">
        <div className="alerta-linea">
          <strong>{etiqueta(a.tipo_alerta)}</strong>
          {coladera && (
            <Link to={`/panel/coladeras/${coladera.id_coladera}`} className="mono alerta-col">
              {coladera.codigo}
            </Link>
          )}
        </div>
        {!compacto && a.descripcion && <p className="alerta-desc">{a.descripcion}</p>}
        <div className="alerta-meta">
          <span title={fechaHora(a.fecha_hora)}>{haceCuanto(a.fecha_hora)}</span>
          {medicion && !compacto && (
            <span>
              · lectura #{medicion.id_medicion}: <b className="num">{numero(medicion.valor)}</b>
            </span>
          )}
        </div>
      </div>
      <Badge tono={abierta ? tono : 'muted'}>{etiqueta(a.estado_alerta)}</Badge>
    </div>
  )
}

export function ResultadoLimpieza({ l }) {
  const r = norm(l.resultado)
  if (!l.pir_seguro || r.includes('pospuesta') || r.includes('bloq'))
    return (
      <Badge tono="warn">
        <ShieldAlert size={12} /> Pospuesta por PIR
      </Badge>
    )
  if (r.includes('proceso') || (!l.fecha_fin && r !== 'fallida'))
    return (
      <Badge tono="info" punto>
        En proceso
      </Badge>
    )
  if (limpiezaExitosa(l))
    return (
      <Badge tono="ok">
        <CircleCheck size={12} /> {etiqueta(l.resultado)}
      </Badge>
    )
  return (
    <Badge tono={r.includes('parcial') ? 'warn' : 'crit'}>
      <CircleX size={12} /> {etiqueta(l.resultado)}
    </Badge>
  )
}

export function LimpiezaItem({ l, coladera }) {
  return (
    <div className="limpieza-item">
      <span className={`limpieza-icono ${l.pir_seguro ? 'ok' : 'warn'}`}>{l.pir_seguro ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}</span>
      <div className="alerta-cuerpo">
        <div className="alerta-linea">
          <strong>{l.pir_seguro ? 'Limpieza con rastrillo' : 'Limpieza pospuesta'}</strong>
          {coladera && (
            <Link to={`/panel/coladeras/${coladera.id_coladera}`} className="mono alerta-col">
              {coladera.codigo}
            </Link>
          )}
        </div>
        <div className="alerta-meta">
          <span title={fechaHora(l.fecha_inicio)}>{haceCuanto(l.fecha_inicio)}</span>
          {l.fecha_fin && <span>· duró {duracion(l.fecha_inicio, l.fecha_fin)}</span>}
          {!l.pir_seguro && <span>· persona o animal detectado</span>}
        </div>
      </div>
      <ResultadoLimpieza l={l} />
    </div>
  )
}
