import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BellRing, Download, Search } from 'lucide-react'
import { useDatos } from '../services/useDatos'
import { alertaAbierta } from '../utils/reglas'
import { Badge, Encabezado, Esqueleto, Kpi, Segmentado, Vacio } from '../components/ui'
import { TooltipPluvia, ejeProps } from '../components/graficas'
import { tonoPrioridad } from '../utils/dominio'
import { descargarCSV, etiqueta, fechaHora, haceCuanto, ms, norm, numero } from '../utils/format'
import { TriangleAlert, CircleCheck, Timer } from 'lucide-react'

const DIA = 86_400_000

export default function Alertas() {
  const { alertas, cargando, colDeAlerta, coladeraPorId, estado, medAlertas, limpiezas } = useDatos()
  const [vista, setVista] = useState('abiertas')
  const [prioridad, setPrioridad] = useState('')
  const [coladera, setColadera] = useState('')
  const [texto, setTexto] = useState('')

  const filtradas = useMemo(
    () =>
      alertas
        .filter((a) => (vista === 'abiertas' ? alertaAbierta(a) : vista === 'cerradas' ? !alertaAbierta(a) : true))
        .filter((a) => !prioridad || tonoPrioridad(a.nivel_prioridad) === prioridad)
        .filter((a) => !coladera || String(colDeAlerta(a)) === coladera)
        .filter((a) => !texto || norm(`${a.tipo_alerta} ${a.descripcion} ${coladeraPorId[colDeAlerta(a)]?.codigo}`).includes(norm(texto)))
        .sort((a, b) => ms(b.fecha_hora) - ms(a.fecha_hora)),
    [alertas, vista, prioridad, coladera, texto, colDeAlerta, coladeraPorId],
  )

  const abiertas = alertas.filter(alertaAbierta)
  const altas = abiertas.filter((a) => tonoPrioridad(a.nivel_prioridad) === 'crit').length

  // Tiempo promedio de atención: alerta crítica → limpieza exitosa vinculada
  const tiempos = alertas
    .map((a) => {
      const l = limpiezas.find((x) => x.id_alerta === a.id_alerta && x.pir_seguro && x.fecha_fin)
      return l ? (ms(l.fecha_fin) - ms(a.fecha_hora)) / 60000 : null
    })
    .filter((x) => x != null && x >= 0)
  const promedio = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null

  const porDia = useMemo(() => {
    const dias = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    for (let i = 6; i >= 0; i--) dias.push({ t: hoy.getTime() - i * DIA, crit: 0, warn: 0, info: 0 })
    for (const a of alertas) {
      const d = new Date(ms(a.fecha_hora))
      d.setHours(0, 0, 0, 0)
      const fila = dias.find((x) => x.t === d.getTime())
      if (fila) fila[tonoPrioridad(a.nivel_prioridad)]++
    }
    return dias.map((d) => ({ ...d, dia: new Date(d.t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }) }))
  }, [alertas])

  const exportar = () =>
    descargarCSV('alertas-pluvia.csv', filtradas, [
      { titulo: 'id_alerta', valor: (a) => a.id_alerta },
      { titulo: 'coladera', valor: (a) => coladeraPorId[colDeAlerta(a)]?.codigo },
      { titulo: 'tipo_alerta', valor: (a) => a.tipo_alerta },
      { titulo: 'nivel_prioridad', valor: (a) => a.nivel_prioridad },
      { titulo: 'estado_alerta', valor: (a) => a.estado_alerta },
      { titulo: 'fecha_hora', valor: (a) => a.fecha_hora },
      { titulo: 'descripcion', valor: (a) => a.descripcion },
      { titulo: 'id_medicion', valor: (a) => a.id_medicion },
    ])

  return (
    <>
      <Encabezado titulo="Alertas" subtitulo="Situaciones de riesgo detectadas a partir de las mediciones: acumulación de residuos, obstrucción crítica, lecturas inválidas y dispositivos sin conexión (últimos 7 días).">
        <button className="btn btn-sm" onClick={exportar} disabled={!filtradas.length}>
          <Download size={14} /> Exportar CSV
        </button>
      </Encabezado>

      <section className="kpis">
        <Kpi icono={BellRing} tono="warn" titulo="Abiertas" valor={abiertas.length} detalle="Requieren atención" />
        <Kpi icono={TriangleAlert} tono="crit" titulo="Prioridad alta" valor={altas} detalle="Obstrucciones críticas abiertas" />
        <Kpi icono={CircleCheck} tono="ok" titulo="Resueltas (7 d)" valor={alertas.length - abiertas.length} detalle={`de ${alertas.length} generadas`} />
        <Kpi icono={Timer} tono="info" titulo="Tiempo de atención" valor={promedio == null ? '—' : numero(promedio, 1)} unidad="min" detalle="Alerta → limpieza completada" />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Alertas por día</h3>
            <p>Según su nivel de prioridad</p>
          </div>
          <div className="leyenda">
            <span><i style={{ background: 'var(--crit-fill)' }} /> Alta</span>
            <span><i style={{ background: 'var(--warn-fill)' }} /> Media</span>
            <span><i style={{ background: 'var(--info)' }} /> Baja</span>
          </div>
        </div>
        <div className="card-body">
          <div className="grafica" style={{ height: 200 }}>
            {cargando ? (
              <Esqueleto alto={200} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDia} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="dia" {...ejeProps} />
                  <YAxis allowDecimals={false} {...ejeProps} />
                  <Tooltip content={<TooltipPluvia formatoX="texto" nombres={{ crit: 'Alta', warn: 'Media', info: 'Baja' }} />} cursor={{ fill: 'var(--surface-3)' }} />
                  <Bar dataKey="crit" stackId="a" fill="var(--crit-fill)" />
                  <Bar dataKey="warn" stackId="a" fill="var(--warn-fill)" />
                  <Bar dataKey="info" stackId="a" fill="var(--info)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="filtros">
          <Segmentado
            etiqueta="Estado"
            valor={vista}
            onChange={setVista}
            opciones={[
              { valor: 'abiertas', texto: `Abiertas (${abiertas.length})` },
              { valor: 'cerradas', texto: 'Cerradas' },
              { valor: 'todas', texto: 'Todas' },
            ]}
          />
          <label className="campo">
            <span>Prioridad</span>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
              <option value="">Todas</option>
              <option value="crit">Alta</option>
              <option value="warn">Media</option>
              <option value="info">Baja</option>
            </select>
          </label>
          <label className="campo">
            <span>Coladera</span>
            <select value={coladera} onChange={(e) => setColadera(e.target.value)}>
              <option value="">Todas</option>
              {estado.map((c) => (
                <option key={c.id_coladera} value={c.id_coladera}>
                  {c.codigo} · {c.colonia}
                </option>
              ))}
            </select>
          </label>
          <label className="campo" style={{ maxWidth: 280 }}>
            <span>Buscar</span>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--ink-3)' }} />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Tipo, descripción…" style={{ paddingLeft: 32, width: '100%' }} />
            </div>
          </label>
        </div>
        {cargando ? (
          <div className="card-body">
            <Esqueleto alto={200} />
          </div>
        ) : filtradas.length ? (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Prioridad</th>
                  <th>Alerta</th>
                  <th>Coladera</th>
                  <th>Lectura que la originó</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, 200).map((a) => {
                  const c = coladeraPorId[colDeAlerta(a)]
                  const m = medAlertas[a.id_medicion]
                  const tono = tonoPrioridad(a.nivel_prioridad)
                  return (
                    <tr key={a.id_alerta}>
                      <td>
                        <Badge tono={tono} punto>
                          {etiqueta(a.nivel_prioridad)}
                        </Badge>
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <strong>{etiqueta(a.tipo_alerta)}</strong>
                        <div className="sutil">{a.descripcion}</div>
                      </td>
                      <td>
                        {c ? (
                          <Link to={`/panel/coladeras/${c.id_coladera}`} className="alerta-col mono">
                            {c.codigo}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="num">
                        {m ? (
                          <>
                            #{m.id_medicion} · <b>{numero(m.valor)}</b>
                          </>
                        ) : (
                          <span className="sutil">#{a.id_medicion}</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {fechaHora(a.fecha_hora)}
                        <div className="sutil">{haceCuanto(a.fecha_hora)}</div>
                      </td>
                      <td>
                        <Badge tono={alertaAbierta(a) ? tono : 'muted'}>{etiqueta(a.estado_alerta)}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vacio icono={BellRing} titulo={vista === 'abiertas' ? '¡Todo en orden!' : 'Sin resultados'} texto={vista === 'abiertas' ? 'No hay alertas abiertas en este momento.' : 'Ninguna alerta coincide con los filtros.'} />
        )}
        {filtradas.length > 200 && <div className="paginacion">Mostrando 200 de {filtradas.length}. Usa los filtros para acotar.</div>}
      </section>
    </>
  )
}
