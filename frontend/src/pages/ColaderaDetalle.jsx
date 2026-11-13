import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BellRing, Brush, ChevronRight, CircleAlert, CloudRain, Cpu, Lightbulb, Moon, ShieldAlert, ShieldCheck, Sun, TriangleAlert, Wifi, WifiOff, Cog, CircleCheck } from 'lucide-react'
import { useDatos } from '../services/useDatos'
import { esValida } from '../utils/reglas'
import * as api from '../services/api'
import ColaderaVisual from '../components/ColaderaVisual'
import { AlertaItem, LimpiezaItem } from '../components/piezas'
import { Badge, Encabezado, Esqueleto, Medidor, RiesgoBadge, Segmentado, Vacio, useAhora } from '../components/ui'
import { TooltipPluvia, agrupar, ejeProps, tickDia, tickHora, ticksDiarios } from '../components/graficas'
import { VARIABLES, claveVariable, esDeDia, infoVariable, porcentajeObstruccion, valorLegible } from '../utils/dominio'
import { clamp, enLista, etiqueta, haceCuanto, ms, norm, numero } from '../utils/format'
import { VALORES } from '../config/db'
import { formatoHoras } from './Panel'

const HORA = 3_600_000
const RANGOS = [
  { valor: 6, texto: '6 h' },
  { valor: 24, texto: '24 h' },
  { valor: 168, texto: '7 días' },
]

export default function ColaderaDetalle() {
  const { id } = useParams()
  const { coladeraPorId, cargando, alertas, colDeAlerta, medAlertas } = useDatos()
  useAhora(10000)
  const c = coladeraPorId[Number(id)]

  if (cargando)
    return (
      <>
        <Esqueleto alto={40} ancho="40%" />
        <div className="detalle-hero">
          <Esqueleto alto={360} r={14} />
          <Esqueleto alto={360} r={14} />
        </div>
      </>
    )
  if (!c) return <Vacio icono={CircleAlert} titulo="Coladera no encontrada" texto={`No existe una coladera con id ${id}.`}><Link to="/panel" className="btn btn-sm">Volver al panel</Link></Vacio>

  const hum = c.lecturas.humedad ? Number(c.lecturas.humedad.valor) : 0
  const lluvia = clamp((hum - 80) / 18, 0, 1)
  const dia = esDeDia(c.lecturas.luz?.valor, c.lecturas.luz?.unidad)
  const alertasCol = alertas.filter((a) => colDeAlerta(a) === c.id_coladera)

  return (
    <>
      <Encabezado
        migas={
          <>
            <Link to="/panel">Panel</Link> <ChevronRight size={13} /> <span className="mono">{c.codigo}</span>
          </>
        }
        titulo={c.calle}
        subtitulo={`${c.colonia}, ${c.municipio} · código ${c.codigo}`}
      >
        <Badge tono={norm(c.estado_operativo) === 'activa' ? 'ok' : 'warn'}>Coladera {etiqueta(c.estado_operativo).toLowerCase()}</Badge>
        <Badge tono={c.conectado ? 'accent' : 'muted'}>
          {c.conectado ? <Wifi size={12} /> : <WifiOff size={12} />} {c.conectado ? 'En línea' : 'Desconectado'}
        </Badge>
      </Encabezado>

      <section className="detalle-hero">
        <div className="card visual-card">
          <ColaderaVisual referencia={Number(c.distancia_referencia_cm)} umbral={Number(c.umbral_obstruccion_cm)} distancia={c.distancia} lluvia={lluvia} presencia={c.presencia} limpiando={c.limpiando} riesgo={c.riesgo} deDia={dia ?? true} />
          <div className="chips">
            <span className="chip">
              <span className="chip-led" style={{ background: { rojo: '#ff4d6d', ambar: '#ffb21e', verde: '#2ee6c8' }[norm(c.led?.estado_actual)] ?? '#9aa9b1' }} />
              LED <b>{etiqueta(c.led?.estado_actual)}</b>
            </span>
            <span className="chip">
              <Cog size={14} /> Servo <b>{etiqueta(c.servo?.estado_actual)}</b>
            </span>
            <span className="chip">
              {c.presencia ? <ShieldAlert size={14} color="var(--c-presencia)" /> : <ShieldCheck size={14} color="var(--ok)" />} PIR <b>{c.presencia == null ? '—' : c.presencia ? 'Presencia detectada' : 'Zona libre'}</b>
            </span>
            <span className="chip">
              {dia === false ? <Moon size={14} /> : <Sun size={14} />} <b>{dia == null ? '—' : dia ? 'Día' : 'Noche'}</b>
            </span>
            {lluvia > 0 && (
              <span className="chip">
                <CloudRain size={14} color="var(--c-humedad)" /> <b>Lluvia</b>
              </span>
            )}
          </div>
        </div>

        <div className={`card estado-card riesgo-${c.riesgo}`}>
          <div>
            <div className="estado-nivel">
              <div>
                <div className="etiqueta-mono" style={{ marginBottom: 8 }}>
                  Obstrucción de la rejilla
                </div>
                <span className="estado-pct num">
                  {c.obstruccion == null ? '—' : Math.round(c.obstruccion)}
                  <small>%</small>
                </span>
              </div>
              <RiesgoBadge riesgo={c.riesgo} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Medidor
                pct={c.obstruccion}
                riesgo={c.riesgo}
                umbralPct={((Number(c.distancia_referencia_cm) - Number(c.umbral_obstruccion_cm)) / Number(c.distancia_referencia_cm)) * 100}
                segmentos={30}
                grande
                escala
              />
            </div>
          </div>
          <div className="metricas">
            <div className="metrica">
              <span>Distancia</span>
              <b>{numero(c.distancia)}</b>
              <small>cm</small>
            </div>
            <div className="metrica">
              <span>Umbral</span>
              <b>{numero(c.umbral_obstruccion_cm)}</b>
              <small>cm</small>
            </div>
            <div className="metrica">
              <span>Rejilla limpia</span>
              <b>{numero(c.distancia_referencia_cm)}</b>
              <small>cm</small>
            </div>
            <div className="metrica">
              <span>Últ. lectura</span>
              <b style={{ fontSize: 17 }}>{haceCuanto(c.ultimaLectura)}</b>
            </div>
          </div>
          <EstadoSeguridad c={c} />
          <div>
            <div className="subtitulo" style={{ marginTop: 0 }}>
              Actividad reciente
            </div>
            <div className="chips">
              <span className="chip">
                <BellRing size={14} /> <b>{c.alertasAbiertas.length}</b> alertas abiertas
              </span>
              <span className="chip">
                <Brush size={14} /> <b>{c.limpiezas.filter((l) => l.pir_seguro).length}</b> limpiezas (7 d)
              </span>
              <span className="chip">
                <ShieldAlert size={14} /> <b>{c.limpiezas.filter((l) => !l.pir_seguro).length}</b> pospuestas por PIR
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="sensores" aria-label="Sensores">
        {Object.keys(VARIABLES).map((k) => (
          <SensorTile key={k} clave={k} c={c} />
        ))}
      </section>

      <GraficaHistorial c={c} />

      <div className="dos-col">
        <section className="card">
          <ActividadTabs alertas={alertasCol} limpiezas={c.limpiezas} medAlertas={medAlertas} />
        </section>
        <Componentes c={c} />
      </div>
    </>
  )
}

function EstadoSeguridad({ c }) {
  let tono = 'ok'
  let Icono = CircleCheck
  let titulo = 'Flujo normal'
  let texto = 'La rejilla está despejada. No se requiere ninguna acción.'
  if (c.sinSenal || !c.conectado) {
    tono = 'info'
    Icono = WifiOff
    titulo = 'Sin señal del dispositivo'
    texto = c.ultimaLectura ? `Última telemetría ${haceCuanto(c.ultimaLectura)}. Revisa la conexión Wi-Fi del ESP8266.` : 'Este dispositivo aún no ha enviado lecturas.'
  } else if (c.limpiando) {
    tono = 'info'
    Icono = Brush
    titulo = 'Rastrillo en movimiento'
    texto = 'El PIR confirmó que no hay personas ni animales cerca y el servomotor está retirando la basura.'
  } else if (c.riesgo === 'critico' && c.presencia) {
    tono = 'warn'
    Icono = ShieldAlert
    titulo = 'Limpieza en espera por seguridad'
    texto = 'Hay obstrucción crítica, pero el sensor PIR detecta a alguien cerca. El rastrillo se activará cuando la zona esté libre.'
  } else if (c.riesgo === 'critico') {
    tono = 'crit'
    Icono = TriangleAlert
    titulo = 'Obstrucción crítica'
    texto = `La basura está a menos de ${numero(c.umbral_obstruccion_cm)} cm del sensor. El sistema activará el rastrillo automáticamente.`
  } else if (c.riesgo === 'precaucion') {
    tono = 'warn'
    Icono = CircleAlert
    titulo = 'Acumulación en aumento'
    texto =
      c.pronostico?.estado === 'llenando'
        ? `Al ritmo actual (${numero(-c.pronostico.pendiente)} cm/h) llegaría al umbral en ~${formatoHoras(c.pronostico.horas)}.`
        : 'Se está acumulando basura sobre la rejilla. Conviene programar una revisión.'
  } else if (c.pronostico?.estado === 'llenando') {
    texto = `Llenado lento (${numero(-c.pronostico.pendiente)} cm/h). Umbral estimado en ~${formatoHoras(c.pronostico.horas)}.`
  }
  return (
    <div className={`seguridad aviso-${tono}`}>
      <Icono size={20} style={{ flex: 'none', marginTop: 1 }} />
      <div>
        <strong>{titulo}</strong>
        <p>{texto}</p>
      </div>
    </div>
  )
}

function SensorTile({ clave, c }) {
  const V = VARIABLES[clave]
  const m = c.lecturas[clave]
  const inv = c.invalidas[clave]
  const sensor = c.sensores.find((s) => s.id_sensor === (m ?? inv)?.id_sensor)
  let valor = m ? valorLegible(clave, m.valor) : '—'
  let unidad = m?.unidad && clave !== 'presencia' ? m.unidad : ''
  if (clave === 'luz' && m) {
    const d = esDeDia(m.valor, m.unidad)
    unidad = `${m.unidad} · ${d ? 'día' : 'noche'}`
  }
  return (
    <div className="card sensor-tile">
      <div className="sensor-tile-head">
        <V.icono size={16} style={{ color: V.color }} />
        {V.titulo}
      </div>
      <div className="sensor-valor num" style={clave === 'presencia' ? { fontSize: 22, color: m && Number(m.valor) >= 1 ? 'var(--c-presencia)' : undefined } : undefined}>
        {valor}
        {unidad && <small>{unidad}</small>}
      </div>
      <div className="sensor-meta">
        {sensor ? (
          <>
            <span className="mono">{sensor.codigo_sensor}</span> · {sensor.modelo}
          </>
        ) : (
          V.sensor
        )}
      </div>
      <div className="sensor-meta">{m ? haceCuanto(m.fecha_hora) : 'sin lecturas'}</div>
      {inv && (
        <div className="sensor-invalida" title={`Lectura #${inv.id_medicion}: ${inv.valor} (${inv.calidad_dato})`}>
          <TriangleAlert size={12} /> Última lectura inválida excluida
        </div>
      )}
    </div>
  )
}

function GraficaHistorial({ c }) {
  const { tipoPorId, ultimas } = useDatos()
  const tipos = Object.values(tipoPorId)
  const [variable, setVariable] = useState('distancia')
  const [horas, setHoras] = useState(24)
  const [datos, setDatos] = useState({ cargando: true, series: {} })

  const tipoDe = (k) => tipos.find((t) => claveVariable(t.nombre_variable) === k)
  const necesita = variable === 'correlacion' ? ['distancia', 'humedad'] : [variable]
  const clave = `${c.id_coladera}-${necesita.join(',')}-${horas}`

  useEffect(() => {
    let vivo = true
    setDatos((d) => ({ ...d, cargando: true }))
    const desde = new Date(Date.now() - horas * HORA).toISOString()
    const ids = c.sensores.map((s) => s.id_sensor)
    Promise.all(necesita.map((k) => (tipoDe(k) ? api.serie({ idSensores: ids, idTipo: tipoDe(k).id_tipo_variable, desde, limite: 1000 }) : Promise.resolve([]))))
      .then((res) => vivo && setDatos({ cargando: false, series: Object.fromEntries(necesita.map((k, i) => [k, res[i]])) }))
      .catch(() => vivo && setDatos({ cargando: false, series: {} }))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  // Mezcla las lecturas que llegan en tiempo real con la serie descargada
  const series = useMemo(() => {
    const out = {}
    for (const k of necesita) {
      const base = datos.series[k] ?? []
      const t = tipoDe(k)
      const ultimo = base.length ? ms(base.at(-1).fecha_hora) : 0
      const nuevas = c.sensores
        .flatMap((s) => ultimas[s.id_sensor] ?? [])
        .filter((m) => m.id_tipo_variable === t?.id_tipo_variable && ms(m.fecha_hora) > ultimo)
        .sort((a, b) => ms(a.fecha_hora) - ms(b.fecha_hora))
      out[k] = [...base, ...nuevas]
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, ultimas, clave])

  const excluidas = Object.values(series).flat().filter((m) => !esValida(m)).length
  const unidad = tipoDe(variable)?.unidad_medida ?? ''
  const V = infoVariable(variable)
  const ref = Number(c.distancia_referencia_cm)

  let grafica = null
  if (variable === 'correlacion') {
    const filas = agrupar(
      {
        obstruccion: (series.distancia ?? []).filter(esValida).map((m) => [ms(m.fecha_hora), porcentajeObstruccion(Number(m.valor), ref)]),
        humedad: (series.humedad ?? []).filter(esValida).map((m) => [ms(m.fecha_hora), Number(m.valor)]),
      },
      horas > 48 ? HORA : 15 * 60_000,
    )
    grafica = (
      <ComposedChart data={filas} margin={{ top: 8, right: 0, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={horas > 48 ? tickDia : tickHora} ticks={horas > 48 ? ticksDiarios(filas) : undefined} {...ejeProps} minTickGap={40} />
        <YAxis yAxisId="o" domain={[0, 100]} unit="%" {...ejeProps} width={58} />
        <YAxis yAxisId="h" orientation="right" domain={[0, 100]} unit="%" {...ejeProps} width={44} />
        <Tooltip content={<TooltipPluvia nombres={{ obstruccion: 'Obstrucción', humedad: 'Humedad' }} />} />
        <Area yAxisId="h" dataKey="humedad" unit="%" stroke="var(--c-humedad)" fill="var(--c-humedad)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} connectNulls />
        <Line yAxisId="o" dataKey="obstruccion" unit="%" stroke="var(--c-temperatura)" strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls />
      </ComposedChart>
    )
  } else {
    const filas = (series[variable] ?? []).filter(esValida).map((m) => ({ t: ms(m.fecha_hora), v: Number(m.valor) }))
    const presencia = variable === 'presencia'
    grafica = (
      <AreaChart data={filas} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="relleno-var" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={V.color} stopOpacity={0.3} />
            <stop offset="1" stopColor={V.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={horas > 48 ? tickDia : tickHora} ticks={horas > 48 ? ticksDiarios(filas) : undefined} {...ejeProps} minTickGap={40} />
        <YAxis
          {...ejeProps}
          width={presencia ? 44 : 66}
          domain={variable === 'distancia' ? [0, Math.ceil(ref + 5)] : presencia ? [0, 1] : ['auto', 'auto']}
          ticks={presencia ? [0, 1] : undefined}
          tickFormatter={presencia ? (v) => (v ? 'Sí' : 'No') : undefined}
          unit={presencia ? undefined : ` ${unidad}`}
        />
        <Tooltip content={<TooltipPluvia unidad={presencia ? '' : ` ${unidad}`} nombres={{ v: V.titulo }} />} />
        {variable === 'distancia' && (
          <>
            <ReferenceLine y={Number(c.umbral_obstruccion_cm)} stroke="var(--crit-fill)" strokeDasharray="5 4" label={{ value: 'umbral crítico', position: 'insideTopLeft', fill: 'var(--crit)', fontSize: 11 }} />
            <ReferenceLine y={ref} stroke="var(--ink-3)" strokeDasharray="2 4" label={{ value: 'rejilla limpia', position: 'insideBottomLeft', fill: 'var(--ink-3)', fontSize: 11 }} />
          </>
        )}
        <Area type={presencia ? 'stepAfter' : 'monotone'} dataKey="v" name={V.titulo} stroke={V.color} strokeWidth={2} fill="url(#relleno-var)" dot={false} isAnimationActive={false} />
      </AreaChart>
    )
  }

  const hayDatos = Object.values(series).some((s) => s.length)

  return (
    <section className="card">
      <div className="card-head">
        <div className="tabs" role="tablist">
          {Object.entries(VARIABLES).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={variable === k} className={variable === k ? 'activo' : ''} onClick={() => setVariable(k)}>
              <v.icono size={14} style={{ color: v.color }} /> {v.corto}
            </button>
          ))}
          <button role="tab" aria-selected={variable === 'correlacion'} className={variable === 'correlacion' ? 'activo' : ''} onClick={() => setVariable('correlacion')}>
            <CloudRain size={14} style={{ color: 'var(--c-humedad)' }} /> Lluvia vs. basura
          </button>
        </div>
        <Segmentado etiqueta="Rango de tiempo" opciones={RANGOS} valor={horas} onChange={setHoras} />
      </div>
      <div className="card-body">
        <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>
          {variable === 'correlacion'
            ? 'Compara la humedad (indicador de lluvia) con el porcentaje de obstrucción: cuando llueve, la basura se acumula más rápido.'
            : variable === 'distancia'
              ? 'Distancia del sensor ultrasónico a la basura: mientras más baja, más obstruida está la rejilla.'
              : `Lecturas del sensor ${V.sensor}.`}
          {excluidas > 0 && (
            <span style={{ color: 'var(--warn)' }}>
              {' '}
              · {excluidas} lectura{excluidas > 1 ? 's' : ''} fuera de rango excluida{excluidas > 1 ? 's' : ''} (RNF02).
            </span>
          )}
        </p>
        <div className="grafica" style={{ height: 320 }}>
          {datos.cargando ? (
            <Esqueleto alto={320} />
          ) : hayDatos ? (
            <ResponsiveContainer width="100%" height="100%">
              {grafica}
            </ResponsiveContainer>
          ) : (
            <Vacio titulo="Sin lecturas en este rango" texto="Prueba con un rango de tiempo mayor." />
          )}
        </div>
      </div>
    </section>
  )
}

function ActividadTabs({ alertas, limpiezas, medAlertas }) {
  const [tab, setTab] = useState('alertas')
  return (
    <>
      <div className="card-head">
        <h3>Actividad de esta coladera</h3>
        <Segmentado
          etiqueta="Tipo de actividad"
          valor={tab}
          onChange={setTab}
          opciones={[
            { valor: 'alertas', texto: `Alertas (${alertas.length})` },
            { valor: 'limpiezas', texto: `Limpiezas (${limpiezas.length})` },
          ]}
        />
      </div>
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {tab === 'alertas' ? (
          alertas.length ? (
            alertas.slice(0, 30).map((a) => <AlertaItem key={a.id_alerta} a={a} medicion={medAlertas[a.id_medicion]} />)
          ) : (
            <Vacio icono={BellRing} titulo="Sin alertas" texto="Esta coladera no ha generado alertas en 7 días." />
          )
        ) : limpiezas.length ? (
          limpiezas.slice(0, 30).map((l) => <LimpiezaItem key={l.id_accion} l={l} />)
        ) : (
          <Vacio icono={Brush} titulo="Sin limpiezas" texto="El rastrillo no se ha activado en 7 días." />
        )}
      </div>
    </>
  )
}

function Componentes({ c }) {
  const iconoSensor = (s) => {
    const t = norm(s.tipo_sensor)
    const k = t.includes('ultra') ? 'distancia' : t.includes('temp') || t.includes('hum') ? 'temperatura' : t.includes('luz') ? 'luz' : t.includes('pres') ? 'presencia' : null
    return VARIABLES[k] ?? null
  }
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>Dispositivo y componentes</h3>
          <p>Microcontrolador, sensores y actuadores instalados</p>
        </div>
      </div>
      <div className="card-body">
        {c.dispositivos.map((d) => (
          <div key={d.id_dispositivo}>
            <div className="componente" style={{ marginBottom: 10 }}>
              <span className="componente-icono">
                <Cpu size={17} />
              </span>
              <div>
                <strong>{d.modelo}</strong>
                <span className="mono">{d.numero_serie}</span>
              </div>
              <Badge tono={enLista(d.estado_conexion, VALORES.conectado) ? 'ok' : 'muted'} punto>
                {etiqueta(d.estado_conexion)}
              </Badge>
            </div>
            <div className="sensor-meta" style={{ marginBottom: 4 }}>
              Instalado el {new Date(String(d.fecha_instalacion).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        ))}
        <div className="subtitulo">Sensores</div>
        <div className="componentes">
          {c.sensores.map((s) => {
            const V = iconoSensor(s)
            const Icono = V?.icono ?? Cpu
            return (
              <div key={s.id_sensor} className="componente">
                <span className="componente-icono" style={{ color: V?.color }}>
                  <Icono size={16} />
                </span>
                <div>
                  <strong>{s.tipo_sensor}</strong>
                  <span>
                    <span className="mono">{s.codigo_sensor}</span> · {s.modelo}
                  </span>
                </div>
                <Badge tono={/operativo|activo|ok/i.test(s.estado_sensor) ? 'ok' : 'warn'}>{etiqueta(s.estado_sensor)}</Badge>
              </div>
            )
          })}
        </div>
        <div className="subtitulo">Actuadores</div>
        <div className="componentes">
          {c.actuadores.map((a) => (
            <div key={a.id_actuador} className="componente">
              <span className="componente-icono">{norm(a.tipo_actuador).includes('led') ? <Lightbulb size={16} /> : <Cog size={16} />}</span>
              <div>
                <strong>{norm(a.tipo_actuador).includes('servo') ? 'Servomotor del rastrillo' : `${a.tipo_actuador} de alerta`}</strong>
                <span className="mono">{a.codigo_actuador}</span>
              </div>
              <Badge tono={/activo|rojo/i.test(a.estado_actual) ? 'crit' : /espera|ambar/i.test(a.estado_actual) ? 'warn' : 'muted'}>{etiqueta(a.estado_actual)}</Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
