import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BellRing, Brush, CloudRain, Hourglass, Moon, Radio, TriangleAlert } from 'lucide-react'
import { useDatos } from '../services/useDatos'
import { esValida, limpiezaExitosa, alertaAbierta } from '../utils/reglas'
import { ColaderaCard, AlertaItem, LimpiezaItem } from '../components/piezas'
import { Encabezado, Esqueleto, Kpi, Segmentado, Vacio, useAhora } from '../components/ui'
import { PALETA, TooltipPluvia, agrupar, ejeProps, tickHora } from '../components/graficas'
import { VARIABLES, esDeDia, ordenRiesgo, porcentajeObstruccion } from '../utils/dominio'
import { ms, numero } from '../utils/format'

const DIA = 86_400_000

export default function Panel() {
  const { estado, alertas, limpiezas, cargando, colDeAlerta, colDeActuador, coladeraPorId, medAlertas } = useDatos()
  const [filtro, setFiltro] = useState('todas')
  useAhora(20000)

  const ordenadas = useMemo(() => [...estado].sort((a, b) => ordenRiesgo[a.riesgo] - ordenRiesgo[b.riesgo] || (b.obstruccion ?? 0) - (a.obstruccion ?? 0)), [estado])
  const visibles = ordenadas.filter((c) => (filtro === 'riesgo' ? ['critico', 'precaucion'].includes(c.riesgo) : filtro === 'normal' ? c.riesgo === 'normal' : true))

  const operando = estado.filter((c) => c.conectado && !c.sinSenal).length
  const criticas = estado.filter((c) => c.riesgo === 'critico').length
  const precaucion = estado.filter((c) => c.riesgo === 'precaucion').length
  const abiertas = estado.flatMap((c) => c.alertasAbiertas)
  const altas = abiertas.filter((a) => /alta|crit/i.test(a.nivel_prioridad)).length
  const ult24 = limpiezas.filter((l) => Date.now() - ms(l.fecha_inicio) < DIA)
  const exitosas = ult24.filter(limpiezaExitosa).length
  const pospuestas = ult24.filter((l) => !l.pir_seguro).length

  const proxima = estado
    .filter((c) => c.pronostico?.estado === 'llenando' && c.riesgo !== 'critico')
    .sort((a, b) => a.pronostico.horas - b.pronostico.horas)[0]

  const humedades = estado.map((c) => c.lecturas.humedad && Number(c.lecturas.humedad.valor)).filter((v) => v != null)
  const humProm = humedades.length ? humedades.reduce((a, b) => a + b, 0) / humedades.length : null
  const lloviendo = humProm != null && humProm >= 85

  const recientes = [...alertas].sort((a, b) => Number(alertaAbierta(b)) - Number(alertaAbierta(a)) || ms(b.fecha_hora) - ms(a.fecha_hora)).slice(0, 6)

  return (
    <>
      <Encabezado
        etiqueta={`Red de monitoreo · Monterrey, N.L. · ${new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}`}
        titulo="Panel general"
        subtitulo="Estado en tiempo real de las coladeras inteligentes: obstrucción, sensores, alertas y limpiezas automáticas."
      >
        {lloviendo && (
          <span className="badge badge-info" style={{ height: 32, padding: '0 10px' }}>
            <CloudRain size={14} /> Lluvia detectada · humedad {Math.round(humProm)}%
          </span>
        )}
      </Encabezado>

      <section className="kpis" aria-label="Indicadores">
        {cargando ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="kpi">
              <Esqueleto alto={14} ancho="60%" />
              <Esqueleto alto={34} ancho="40%" />
              <Esqueleto alto={12} ancho="70%" />
            </div>
          ))
        ) : (
          <>
            <Kpi icono={Radio} titulo="Coladeras operando" valor={operando} unidad={`/ ${estado.length}`} detalle={operando < estado.length ? `${estado.length - operando} sin señal o en mantenimiento` : 'Todas enviando telemetría'} />
            <Kpi icono={TriangleAlert} tono={criticas ? 'crit' : precaucion ? 'warn' : 'ok'} titulo="En riesgo" valor={criticas + precaucion} detalle={`${criticas} crítica${criticas === 1 ? '' : 's'} · ${precaucion} en precaución`} />
            <Kpi icono={BellRing} tono={altas ? 'crit' : 'warn'} titulo="Alertas activas" valor={abiertas.length} detalle={altas ? `${altas} de prioridad alta` : 'Ninguna de prioridad alta'} />
            <Kpi icono={Brush} tono="ok" titulo="Limpiezas (24 h)" valor={exitosas} detalle={pospuestas ? `${pospuestas} pospuesta${pospuestas > 1 ? 's' : ''} por seguridad (PIR)` : 'Sin bloqueos por PIR'} />
          </>
        )}
      </section>

      {proxima && (
        <div className="aviso aviso-ia">
          <div>
            <span className="aviso-ia-tag">
              <Hourglass size={13} /> Pronóstico pluvIA
            </span>
            <strong>
              {proxima.codigo} ({proxima.colonia}) podría llegar al umbral crítico en ~{formatoHoras(proxima.pronostico.horas)}.
            </strong>
            <p>
              Se está llenando a {numero(-proxima.pronostico.pendiente)} cm/h según la tendencia de las últimas 3 h. Conviene programar mantenimiento preventivo.
            </p>
          </div>
          <Link to={`/panel/coladeras/${proxima.id_coladera}`} className="btn btn-sm">
            Ver coladera
          </Link>
        </div>
      )}

      <div className="seccion-titulo">
        <h2>
          <small>01</small>Coladeras
        </h2>
        <Segmentado
          etiqueta="Filtrar coladeras"
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { valor: 'todas', texto: `Todas (${estado.length})` },
            { valor: 'riesgo', texto: `En riesgo (${criticas + precaucion})` },
            { valor: 'normal', texto: 'Normales' },
          ]}
        />
      </div>
      <section className="grid-cols">
        {cargando
          ? [0, 1, 2].map((i) => (
              <div key={i} className="card col-card">
                <Esqueleto alto={14} ancho="40%" />
                <Esqueleto alto={60} />
                <Esqueleto alto={34} />
              </div>
            ))
          : visibles.map((c) => <ColaderaCard key={c.id_coladera} c={c} />)}
        {!cargando && !visibles.length && <Vacio titulo="Nada por aquí" texto="Ninguna coladera coincide con el filtro." />}
      </section>

      <div className="dos-col">
        <div className="pila">
          <GraficaObstruccion estado={estado} cargando={cargando} />
          <Microclima estado={estado} />
        </div>
        <div className="pila">
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Alertas recientes</h3>
                <p>Abiertas primero</p>
              </div>
              <Link to="/panel/alertas" className="ver-todo">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            {recientes.length ? (
              recientes.map((a) => <AlertaItem key={a.id_alerta} a={a} coladera={coladeraPorId[colDeAlerta(a)]} medicion={medAlertas[a.id_medicion]} compacto />)
            ) : (
              <Vacio icono={BellRing} titulo="Sin alertas" texto="No hay alertas en los últimos 7 días." />
            )}
          </section>
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Últimas limpiezas</h3>
                <p>Rastrillo accionado por servomotor</p>
              </div>
              <Link to="/panel/limpiezas" className="ver-todo">
                Historial <ArrowRight size={14} />
              </Link>
            </div>
            {limpiezas.length ? (
              limpiezas.slice(0, 4).map((l) => <LimpiezaItem key={l.id_accion} l={l} coladera={coladeraPorId[colDeActuador[l.id_actuador]]} />)
            ) : (
              <Vacio icono={Brush} titulo="Sin limpiezas" texto="Aún no se ha activado el rastrillo." />
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function GraficaObstruccion({ estado, cargando }) {
  const { datos, umbralPct } = useMemo(() => {
    const series = {}
    for (const c of estado) {
      series[`c${c.id_coladera}`] = c.serieDistancia
        .filter((m) => esValida(m))
        .map((m) => [ms(m.fecha_hora), porcentajeObstruccion(Number(m.valor), Number(c.distancia_referencia_cm))])
        .filter(([, v]) => v != null)
    }
    const ref = estado[0] ? Number(estado[0].distancia_referencia_cm) : 40
    const umbral = estado[0] ? Number(estado[0].umbral_obstruccion_cm) : 10
    return { datos: agrupar(series, 15 * 60_000), umbralPct: ((ref - umbral) / ref) * 100 }
  }, [estado])
  const nombres = Object.fromEntries(estado.map((c) => [`c${c.id_coladera}`, c.codigo]))

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>Obstrucción en las últimas 24 h</h3>
          <p>Porcentaje calculado con el sensor ultrasónico · las caídas bruscas son limpiezas</p>
        </div>
        <span className="etiqueta-mono">Fig. 01</span>
      </div>
      <div className="card-body">
        {cargando ? (
          <Esqueleto alto={300} />
        ) : datos.length ? (
          <>
            <div className="grafica">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datos} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <ReferenceArea y1={umbralPct} y2={100} fill="var(--crit-fill)" fillOpacity={0.08} ifOverflow="hidden" />
                  <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickHora} {...ejeProps} minTickGap={40} />
                  <YAxis domain={[0, 100]} unit="%" {...ejeProps} width={52} />
                  <Tooltip content={<TooltipPluvia unidad="%" nombres={nombres} />} />
                  {estado.map((c, i) => (
                    <Line key={c.id_coladera} dataKey={`c${c.id_coladera}`} name={c.codigo} stroke={PALETA[i % PALETA.length]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="leyenda" style={{ marginTop: 10 }}>
              {estado.map((c, i) => (
                <span key={c.id_coladera}>
                  <i style={{ background: PALETA[i % PALETA.length] }} />
                  <span className="mono">{c.codigo}</span>
                </span>
              ))}
              <span>
                <i style={{ background: 'var(--crit-fill)', opacity: 0.35 }} /> Zona crítica
              </span>
            </div>
          </>
        ) : (
          <Vacio titulo="Sin mediciones" texto="Todavía no hay lecturas del ultrasónico en las últimas 24 h." />
        )}
      </div>
    </section>
  )
}

export function formatoHoras(h) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min`
  return `${Math.round(h / 24)} días`
}

/** Promedio de las variables ambientales (DHT, LDR, PIR) de las coladeras con señal. */
function Microclima({ estado }) {
  const activas = estado.filter((c) => !c.sinSenal)
  const prom = (k) => {
    const v = activas.map((c) => c.lecturas[k] && Number(c.lecturas[k].valor)).filter((x) => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const luz = prom('luz')
  const unidadLuz = activas.find((c) => c.lecturas.luz)?.lecturas.luz.unidad ?? '%'
  const dia = esDeDia(luz, unidadLuz)
  const conPresencia = activas.filter((c) => c.presencia).length
  const items = [
    { k: 'temperatura', valor: numero(prom('temperatura')), unidad: '°C', texto: 'promedio' },
    { k: 'humedad', valor: numero(prom('humedad'), 0), unidad: '%', texto: prom('humedad') >= 85 ? 'probable lluvia' : 'relativa' },
    { k: 'luz', valor: numero(luz, 0), unidad: unidadLuz, texto: dia == null ? '—' : dia ? 'de día' : 'de noche', icono: dia === false ? Moon : undefined },
    { k: 'presencia', valor: conPresencia, unidad: `/ ${activas.length}`, texto: 'con personas cerca' },
  ]
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>Microclima de la red</h3>
          <p>Sensores DHT22, LDR y PIR de las coladeras con señal</p>
        </div>
      </div>
      <div className="card-body microclima">
        {items.map((it) => {
          const V = VARIABLES[it.k]
          const Icono = it.icono ?? V.icono
          return (
            <div key={it.k} className="metrica">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icono size={14} style={{ color: V.color }} /> {V.titulo}
              </span>
              <b>{it.valor}</b>
              <small>{it.unidad}</small>
              <div className="sensor-meta">{it.texto}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
