import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useMatch, Link } from 'react-router-dom'
import { Logo } from './Logo'
import { BellRing, Brush, CloudRain, Database, FlaskConical, History, House, LayoutDashboard, Menu, PersonStanding, TriangleAlert, X } from 'lucide-react'
import { EnVivo, ErrorDatos, TemaToggle } from './ui'
import { useDatos } from '../services/useDatos'
import { simulador as cargarSimulador } from '../services/api'

const NAV = [
  { to: '/panel', texto: 'Panel general', icono: LayoutDashboard, fin: true },
  { to: '/panel/alertas', texto: 'Alertas', icono: BellRing, badge: 'alertas' },
  { to: '/panel/limpiezas', texto: 'Limpiezas', icono: Brush },
  { to: '/panel/historial', texto: 'Historial', icono: History },
]

export default function Layout() {
  const { estado, modo } = useDatos()
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setAbierto(false)
    window.scrollTo(0, 0)
  }, [pathname])

  const alertasAbiertas = estado.reduce((n, c) => n + c.alertasAbiertas.length, 0)
  const criticas = estado.filter((c) => c.riesgo === 'critico').length

  return (
    <div className="app">
      <aside className={`sidebar ${abierto ? 'abierta' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="btn-icono btn-icono-claro solo-movil" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          <span className="nav-sec">Monitoreo</span>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.fin} className="nav-link">
              <n.icono size={18} />
              <span>{n.texto}</span>
              {n.badge === 'alertas' && alertasAbiertas > 0 && <span className="nav-badge">{alertasAbiertas}</span>}
            </NavLink>
          ))}
          <span className="nav-sec">Coladeras</span>
          {estado.map((c) => (
            <NavLink key={c.id_coladera} to={`/panel/coladeras/${c.id_coladera}`} className="nav-link nav-col">
              <span className={`nav-dot riesgo-${c.riesgo}`} />
              <span className="mono">{c.codigo}</span>
              <span className="nav-col-col">{c.colonia}</span>
            </NavLink>
          ))}
          <span className="nav-sec">Proyecto</span>
          <NavLink to="/" end className="nav-link">
            <House size={18} />
            <span>Sobre pluvIA</span>
          </NavLink>
        </nav>
        <div className="sidebar-pie">
          <div className={`fuente fuente-${modo}`}>
            <Database size={14} />
            <div>
              <strong>{modo === 'supabase' ? 'Supabase' : 'Datos de demostración'}</strong>
              <span>{modo === 'supabase' ? 'Conectado a la base de datos' : 'Configura .env para conectar'}</span>
            </div>
          </div>
        </div>
      </aside>
      {abierto && <div className="velo" onClick={() => setAbierto(false)} />}

      <div className="contenido">
        <div className="topbar">
          <button className="btn-icono solo-movil" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <span className="solo-movil topbar-logo">
            <Logo claro={false} size={26} />
          </span>
          {criticas > 0 && (
            <Link to="/panel/alertas" className="topbar-alerta">
              <TriangleAlert size={15} />
              <span>
                {criticas} coladera{criticas > 1 ? 's' : ''} en estado crítico
              </span>
            </Link>
          )}
          <div className="topbar-der">
            {modo === 'demo' && <DemoControles />}
            <EnVivo />
            <TemaToggle />
          </div>
        </div>
        <main className="main">
          <ErrorDatos />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Botones para presentar la demo sin hardware (solo en modo demostración). */
function DemoControles() {
  const { estado } = useDatos()
  const [abierto, setAbierto] = useState(false)
  const [lluvia, setLluvia] = useState(false)
  const caja = useRef(null)
  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => !caja.current?.contains(e.target) && setAbierto(false)
    const esc = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])
  const activas = estado.filter((c) => c.conectado)
  const enDetalle = useMatch('/panel/coladeras/:id')?.params.id
  const [col, setCol] = useState('')
  const porDefecto = activas.some((c) => String(c.id_coladera) === enDetalle) ? enDetalle : activas[0]?.id_coladera
  const id = Number(col || porDefecto)
  return (
    <div className="demo" ref={caja}>
      <button className="btn btn-sm btn-fantasma" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <FlaskConical size={15} /> <span className="solo-escritorio">Simulador</span>
      </button>
      {abierto && (
        <div className="demo-panel card">
          <strong>Simulador de la maqueta</strong>
          <p>Provoca eventos para ver cómo reacciona el sistema durante la presentación.</p>
          <label className="campo">
            <span>Coladera</span>
            <select value={col || porDefecto || ''} onChange={(e) => setCol(e.target.value)}>
              {activas.map((c) => (
                <option key={c.id_coladera} value={c.id_coladera}>
                  {c.codigo} · {c.colonia}
                </option>
              ))}
            </select>
          </label>
          <div className="demo-botones">
            <button className="btn btn-sm" onClick={async () => (await cargarSimulador()).obstruir(id)}>
              <TriangleAlert size={14} /> Tapar con basura
            </button>
            <button className="btn btn-sm" onClick={async () => (await cargarSimulador()).personaCerca(id, 20)}>
              <PersonStanding size={14} /> Persona cerca (20 s)
            </button>
            <button
              className={`btn btn-sm ${lluvia ? 'btn-primario' : ''}`}
              onClick={async () => {
                ;(await cargarSimulador()).lluvia(lluvia ? null : 0.95)
                setLluvia(!lluvia)
              }}
            >
              <CloudRain size={14} /> {lluvia ? 'Detener tormenta' : 'Tormenta intensa'}
            </button>
          </div>
          <small>Tip: activa "Persona cerca" y luego "Tapar con basura" para mostrar el bloqueo de seguridad del PIR.</small>
        </div>
      )}
    </div>
  )
}
