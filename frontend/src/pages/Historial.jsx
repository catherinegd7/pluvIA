import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, History, TriangleAlert } from 'lucide-react'
import { useDatos } from '../services/useDatos'
import { esValida } from '../utils/reglas'
import * as api from '../services/api'
import { Badge, Encabezado, Esqueleto, Vacio } from '../components/ui'
import { claveVariable, infoVariable, valorLegible } from '../utils/dominio'
import { descargarCSV, etiqueta, fechaHora } from '../utils/format'

const POR_PAGINA = 25

/** RF03: consultar las mediciones de cada coladera con su valor, tipo de variable y fecha/hora. */
export default function Historial() {
  const { estado, catalogo, tipoPorId, colDeSensor, coladeraPorId, cargando: cargandoCat, actualizado } = useDatos()
  const [f, setF] = useState({ coladera: '', tipo: '', calidad: '', desde: '', hasta: '' })
  const [pagina, setPagina] = useState(0)
  const [res, setRes] = useState({ filas: [], total: 0, cargando: true, error: null })
  const [exportando, setExportando] = useState(false)

  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }))
    setPagina(0)
  }

  const consulta = (extra = {}) => {
    const sensoresCol = f.coladera ? estado.find((c) => String(c.id_coladera) === f.coladera)?.sensores.map((s) => s.id_sensor) : undefined
    return {
      idSensores: sensoresCol,
      idTipo: f.tipo || undefined,
      calidad: f.calidad,
      desde: f.desde ? new Date(f.desde).toISOString() : undefined,
      hasta: f.hasta ? new Date(f.hasta).toISOString() : undefined,
      pagina,
      porPagina: POR_PAGINA,
      ...extra,
    }
  }

  useEffect(() => {
    if (cargandoCat) return
    let vivo = true
    setRes((r) => ({ ...r, cargando: true }))
    api
      .buscarMediciones(consulta())
      .then(({ filas, total }) => vivo && setRes({ filas, total, cargando: false, error: null }))
      .catch((e) => vivo && setRes({ filas: [], total: 0, cargando: false, error: e.message }))
    return () => {
      vivo = false
    }
    // Se vuelve a consultar al cambiar filtros/página; en la primera página también con datos nuevos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, pagina, cargandoCat, pagina === 0 ? Math.floor((actualizado ?? 0) / 10000) : 0])

  const sensor = (id) => catalogo.sensores.find((s) => s.id_sensor === id)
  const paginas = Math.max(1, Math.ceil(res.total / POR_PAGINA))

  const exportar = async () => {
    setExportando(true)
    try {
      const { filas } = await api.buscarMediciones(consulta({ pagina: 0, porPagina: 1000 }))
      descargarCSV('mediciones-pluvia.csv', filas, [
        { titulo: 'id_medicion', valor: (m) => m.id_medicion },
        { titulo: 'fecha_hora', valor: (m) => m.fecha_hora },
        { titulo: 'coladera', valor: (m) => coladeraPorId[colDeSensor[m.id_sensor]]?.codigo },
        { titulo: 'sensor', valor: (m) => sensor(m.id_sensor)?.codigo_sensor },
        { titulo: 'variable', valor: (m) => tipoPorId[m.id_tipo_variable]?.nombre_variable },
        { titulo: 'valor', valor: (m) => m.valor },
        { titulo: 'unidad', valor: (m) => tipoPorId[m.id_tipo_variable]?.unidad_medida },
        { titulo: 'calidad_dato', valor: (m) => m.calidad_dato },
      ])
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <Encabezado titulo="Historial de mediciones" subtitulo="Todas las lecturas registradas por los sensores de cada coladera, con su valor, tipo de variable y fecha/hora. Las lecturas fuera de rango se marcan y no cuentan en los indicadores.">
        <button className="btn btn-sm" onClick={exportar} disabled={exportando || !res.total}>
          <Download size={14} /> {exportando ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </Encabezado>

      <section className="card">
        <div className="filtros">
          <label className="campo">
            <span>Coladera</span>
            <select value={f.coladera} onChange={set('coladera')}>
              <option value="">Todas</option>
              {estado.map((c) => (
                <option key={c.id_coladera} value={c.id_coladera}>
                  {c.codigo} · {c.colonia}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Variable</span>
            <select value={f.tipo} onChange={set('tipo')}>
              <option value="">Todas</option>
              {catalogo.tipos.map((t) => (
                <option key={t.id_tipo_variable} value={t.id_tipo_variable}>
                  {infoVariable(claveVariable(t.nombre_variable)).titulo} ({t.unidad_medida})
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Calidad del dato</span>
            <select value={f.calidad} onChange={set('calidad')}>
              <option value="">Todas</option>
              <option value="valida">Válidas</option>
              <option value="invalida">Fuera de rango</option>
            </select>
          </label>
          <label className="campo">
            <span>Desde</span>
            <input type="datetime-local" value={f.desde} onChange={set('desde')} />
          </label>
          <label className="campo">
            <span>Hasta</span>
            <input type="datetime-local" value={f.hasta} onChange={set('hasta')} />
          </label>
          {(f.coladera || f.tipo || f.calidad || f.desde || f.hasta) && (
            <button className="btn btn-sm btn-fantasma" onClick={() => (setF({ coladera: '', tipo: '', calidad: '', desde: '', hasta: '' }), setPagina(0))}>
              Limpiar filtros
            </button>
          )}
        </div>

        {res.error ? (
          <div className="card-body">
            <div className="aviso aviso-crit">
              <TriangleAlert size={18} /> {res.error}
            </div>
          </div>
        ) : res.cargando && !res.filas.length ? (
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Esqueleto key={i} alto={30} />
            ))}
          </div>
        ) : res.filas.length ? (
          <div className="tabla-wrap" style={{ opacity: res.cargando ? 0.6 : 1, transition: 'opacity .2s' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha y hora</th>
                  <th>Coladera</th>
                  <th>Sensor</th>
                  <th>Variable</th>
                  <th className="derecha">Valor</th>
                  <th>Calidad</th>
                </tr>
              </thead>
              <tbody>
                {res.filas.map((m) => {
                  const s = sensor(m.id_sensor)
                  const c = coladeraPorId[colDeSensor[m.id_sensor]]
                  const t = tipoPorId[m.id_tipo_variable]
                  const k = claveVariable(t?.nombre_variable)
                  const V = infoVariable(k)
                  const ok = esValida(m)
                  return (
                    <tr key={m.id_medicion} className={ok ? '' : 'invalida'}>
                      <td className="sutil num">{m.id_medicion}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(m.fecha_hora)}</td>
                      <td>
                        {c ? (
                          <Link to={`/panel/coladeras/${c.id_coladera}`} className="alerta-col mono">
                            {c.codigo}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className="mono">{s?.codigo_sensor ?? m.id_sensor}</span>
                        <div className="sutil">{s?.modelo}</div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <V.icono size={14} style={{ color: V.color }} /> {V.titulo}
                        </span>
                      </td>
                      <td className="derecha num" style={{ fontWeight: 600 }}>
                        {k === 'presencia' ? valorLegible(k, m.valor) : `${m.valor} ${t?.unidad_medida ?? ''}`}
                      </td>
                      <td>
                        {ok ? (
                          <Badge tono="ok">{etiqueta(m.calidad_dato)}</Badge>
                        ) : (
                          <Badge tono="warn">
                            <TriangleAlert size={12} /> {etiqueta(m.calidad_dato)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vacio icono={History} titulo="Sin mediciones" texto="No hay lecturas que coincidan con los filtros." />
        )}

        <div className="paginacion">
          <span className="num">
            {res.total ? `${(pagina * POR_PAGINA + 1).toLocaleString('es-MX')}–${Math.min(res.total, (pagina + 1) * POR_PAGINA).toLocaleString('es-MX')} de ${res.total.toLocaleString('es-MX')} mediciones` : '0 mediciones'}
          </span>
          <div>
            <button className="btn btn-sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
              <ChevronLeft size={15} />
            </button>
            <span className="num">
              Página {pagina + 1} de {paginas.toLocaleString('es-MX')}
            </span>
            <button className="btn btn-sm" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)} aria-label="Página siguiente">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
