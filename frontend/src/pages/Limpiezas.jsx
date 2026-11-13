import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Brush, Download, Percent, ShieldAlert, ShieldCheck, Timer } from 'lucide-react'
import { useDatos } from '../services/useDatos'
import { limpiezaExitosa } from '../utils/reglas'
import { Encabezado, Esqueleto, Kpi, Segmentado, Vacio } from '../components/ui'
import { ResultadoLimpieza } from '../components/piezas'
import { TooltipPluvia, ejeProps } from '../components/graficas'
import { descargarCSV, duracion, etiqueta, fechaHora, haceCuanto, ms, numero } from '../utils/format'

const DIA = 86_400_000

export default function Limpiezas() {
  const { limpiezas, cargando, colDeActuador, coladeraPorId, catalogo, alertas } = useDatos()
  const [vista, setVista] = useState('todas')
  const [coladera, setColadera] = useState('')

  const filtradas = limpiezas
    .filter((l) => (vista === 'ejecutadas' ? l.pir_seguro : vista === 'pospuestas' ? !l.pir_seguro : true))
    .filter((l) => !coladera || String(colDeActuador[l.id_actuador]) === coladera)

  const ejecutadas = limpiezas.filter((l) => l.pir_seguro)
  const exitosas = ejecutadas.filter(limpiezaExitosa)
  const tasa = ejecutadas.length ? (exitosas.length / ejecutadas.length) * 100 : null
  const conFin = ejecutadas.filter((l) => l.fecha_fin)
  const durProm = conFin.length ? conFin.reduce((a, l) => a + (ms(l.fecha_fin) - ms(l.fecha_inicio)) / 1000, 0) / conFin.length : null
  const pospuestas = limpiezas.filter((l) => !l.pir_seguro).length

  const porDia = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const dias = Array.from({ length: 7 }, (_, i) => ({ t: hoy.getTime() - (6 - i) * DIA, ok: 0, pir: 0, otro: 0 }))
    for (const l of limpiezas) {
      const d = new Date(ms(l.fecha_inicio))
      d.setHours(0, 0, 0, 0)
      const f = dias.find((x) => x.t === d.getTime())
      if (!f) continue
      if (!l.pir_seguro) f.pir++
      else if (limpiezaExitosa(l)) f.ok++
      else f.otro++
    }
    return dias.map((d) => ({ ...d, dia: new Date(d.t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }) }))
  }, [limpiezas])

  const actuador = (id) => catalogo.actuadores.find((a) => a.id_actuador === id)
  const alerta = (id) => alertas.find((a) => a.id_alerta === id)

  const exportar = () =>
    descargarCSV('limpiezas-pluvia.csv', filtradas, [
      { titulo: 'id_accion', valor: (l) => l.id_accion },
      { titulo: 'coladera', valor: (l) => coladeraPorId[colDeActuador[l.id_actuador]]?.codigo },
      { titulo: 'actuador', valor: (l) => actuador(l.id_actuador)?.codigo_actuador },
      { titulo: 'fecha_inicio', valor: (l) => l.fecha_inicio },
      { titulo: 'fecha_fin', valor: (l) => l.fecha_fin },
      { titulo: 'pir_seguro', valor: (l) => l.pir_seguro },
      { titulo: 'resultado', valor: (l) => l.resultado },
      { titulo: 'id_alerta', valor: (l) => l.id_alerta },
    ])

  return (
    <>
      <Encabezado titulo="Limpiezas automáticas" subtitulo="Cada activación del rastrillo (servomotor). Solo se ejecuta si el sensor PIR confirma que no hay personas ni animales cerca (RF04, RF05).">
        <button className="btn btn-sm" onClick={exportar} disabled={!filtradas.length}>
          <Download size={14} /> Exportar CSV
        </button>
      </Encabezado>

      <section className="kpis">
        <Kpi icono={Brush} titulo="Ejecutadas (7 d)" valor={ejecutadas.length} detalle={`${limpiezas.length} intentos registrados`} />
        <Kpi icono={Percent} tono="ok" titulo="Tasa de éxito" valor={tasa == null ? '—' : Math.round(tasa)} unidad="%" detalle={`${exitosas.length} exitosas`} />
        <Kpi icono={Timer} tono="info" titulo="Duración promedio" valor={durProm == null ? '—' : numero(durProm, 0)} unidad="s" detalle="Recorrido del rastrillo" />
        <Kpi icono={ShieldAlert} tono="warn" titulo="Pospuestas por PIR" valor={pospuestas} detalle="Se detectó presencia cerca" />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Activaciones por día</h3>
            <p>Ejecutadas vs. pospuestas por seguridad</p>
          </div>
          <div className="leyenda">
            <span><i style={{ background: 'var(--ok-fill)' }} /> Exitosa</span>
            <span><i style={{ background: 'var(--c-temperatura)' }} /> Parcial / fallida</span>
            <span><i style={{ background: 'var(--warn-fill)' }} /> Pospuesta (PIR)</span>
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
                  <Tooltip content={<TooltipPluvia formatoX="texto" nombres={{ ok: 'Exitosa', otro: 'Parcial / fallida', pir: 'Pospuesta (PIR)' }} />} cursor={{ fill: 'var(--surface-3)' }} />
                  <Bar dataKey="ok" stackId="a" fill="var(--ok-fill)" />
                  <Bar dataKey="otro" stackId="a" fill="var(--c-temperatura)" />
                  <Bar dataKey="pir" stackId="a" fill="var(--warn-fill)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="filtros">
          <Segmentado
            etiqueta="Tipo"
            valor={vista}
            onChange={setVista}
            opciones={[
              { valor: 'todas', texto: 'Todas' },
              { valor: 'ejecutadas', texto: 'Ejecutadas' },
              { valor: 'pospuestas', texto: 'Pospuestas por PIR' },
            ]}
          />
          <label className="campo">
            <span>Coladera</span>
            <select value={coladera} onChange={(e) => setColadera(e.target.value)}>
              <option value="">Todas</option>
              {Object.values(coladeraPorId).map((c) => (
                <option key={c.id_coladera} value={c.id_coladera}>
                  {c.codigo} · {c.colonia}
                </option>
              ))}
            </select>
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
                  <th>#</th>
                  <th>Coladera</th>
                  <th>Actuador</th>
                  <th>Inicio</th>
                  <th>Duración</th>
                  <th>PIR seguro</th>
                  <th>Alerta vinculada</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, 200).map((l) => {
                  const c = coladeraPorId[colDeActuador[l.id_actuador]]
                  const a = l.id_alerta ? alerta(l.id_alerta) : null
                  return (
                    <tr key={l.id_accion}>
                      <td className="sutil num">{l.id_accion}</td>
                      <td>
                        {c ? (
                          <Link to={`/panel/coladeras/${c.id_coladera}`} className="alerta-col mono">
                            {c.codigo}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="mono">{actuador(l.id_actuador)?.codigo_actuador ?? l.id_actuador}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {fechaHora(l.fecha_inicio)}
                        <div className="sutil">{haceCuanto(l.fecha_inicio)}</div>
                      </td>
                      <td className="num">{duracion(l.fecha_inicio, l.fecha_fin)}</td>
                      <td>
                        {l.pir_seguro ? (
                          <span style={{ color: 'var(--ok)', display: 'inline-flex', gap: 5, alignItems: 'center', fontWeight: 600 }}>
                            <ShieldCheck size={15} /> Sí
                          </span>
                        ) : (
                          <span style={{ color: 'var(--warn)', display: 'inline-flex', gap: 5, alignItems: 'center', fontWeight: 600 }}>
                            <ShieldAlert size={15} /> No
                          </span>
                        )}
                      </td>
                      <td>{a ? <span title={a.descripcion}>#{a.id_alerta} · {etiqueta(a.tipo_alerta)}</span> : l.id_alerta ? `#${l.id_alerta}` : <span className="sutil">Sin alerta (manual)</span>}</td>
                      <td>
                        <ResultadoLimpieza l={l} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vacio icono={Brush} titulo="Sin limpiezas" texto="No hay activaciones que coincidan con el filtro." />
        )}
      </section>
    </>
  )
}
