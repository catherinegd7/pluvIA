import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Logo } from '../components/Logo'
import { ColaderaDemo } from '../components/ColaderaVisual'
import { TemaToggle } from '../components/ui'
import { CerroDeLaSilla, CicloInteractivo, Contador, MapaRed, Subrayado, useRevelar } from '../components/landing'
import { useDatos } from '../services/useDatos'
import { alertaAbierta } from '../utils/reglas'
import { RIESGO } from '../utils/dominio'
import * as api from '../services/api'
import { TABLAS } from '../config/db'

const SECCIONES = [
  ['problema', 'Problema'],
  ['como-funciona', 'Cómo funciona'],
  ['red', 'La red'],
  ['tecnologia', 'Tecnología'],
  ['equipo', 'Equipo'],
]

const BOM = [
  ['Microcontrolador', 'NodeMCU ESP8266 / ESP32', 'Control', 'Procesa las señales, ejecuta la lógica de control y envía la telemetría por Wi-Fi.'],
  ['Sensor de distancia', 'JSN-SR04T / HC-SR04', 'Sensor', 'Mide con pulsos ultrasónicos la distancia a los residuos: la altura de la basura.'],
  ['Sensor de humedad', 'DHT11 / DHT22', 'Sensor', 'Identifica saturación o lluvia alrededor del drenaje.'],
  ['Sensor de temperatura', 'DHT11 / DHT22', 'Sensor', 'Registra el microclima para complementar el monitoreo.'],
  ['Sensor de luz', 'Fotorresistencia (LDR)', 'Sensor', 'Distingue día y noche para el modo nocturno y las alertas.'],
  ['Sensor de presencia', 'PIR HC-SR501', 'Sensor', 'Verifica que no haya personas ni animales antes de mover el mecanismo.'],
  ['Actuador mecánico', 'Servomotor (PWM)', 'Actuador', 'Mueve el rastrillo que saca la basura de la rejilla.'],
  ['Actuador visual', 'Diodos LED', 'Actuador', 'Señal local según la severidad del bloqueo y la visibilidad.'],
  ['Base de datos', 'Supabase · PostgreSQL', 'Nube', 'Guarda mediciones, alertas y limpiezas con historial completo.'],
  ['Dashboard', 'React + JavaScript', 'App', 'Esta página: monitoreo en tiempo real para mantenimiento preventivo.'],
]

// Rol de cada integrante. Deja `null` para mostrar "Rol por definir" mientras se confirma.
const EQUIPO = [
  ['Catherine González Díaz', 'Frontend y dashboard web', 'RF03 · RNF03'],
  ['Diego Gil Flores', 'Backend', 'RF01 · RNF01'],
  ['Diego Villanueva Fernández', 'Prototipo', 'RF02 · RNF02'],
  ['Paula Larios Aguilar', null, 'RF04 · RNF04'],
  ['Jacqueline Carimen Velasco Rosales', null, 'RF05 · RNF05'],
]

const REQUERIMIENTOS = [
  ['RF03', 'Consultar las mediciones de cada coladera con valor, variable y fecha/hora', 'Historial y detalle de coladera'],
  ['RF04', 'Rastrillo automático solo si el PIR confirma que es seguro', 'Estado de seguridad y limpiezas pospuestas'],
  ['RF05', 'Registro de cada activación y de las alertas críticas', 'Alertas y Limpiezas'],
  ['RNF01', 'Telemetría en la base de datos en menos de 2 s', 'Indicador “En vivo” con Supabase Realtime'],
  ['RNF02', 'Lecturas fuera de rango marcadas y excluidas', 'Etiquetas de calidad y filtros'],
]

function Seccion({ id, n, nombre, oscuro = false, children, className = '' }) {
  return (
    <section id={id} className={`l-seccion ${oscuro ? 'l-oscuro' : ''} ${className}`}>
      <div className="l-contenedor">
        <div className="l-sec-head" data-revelar>
          <span className="l-sec-n">
            [ {n} · {nombre} ]
          </span>
        </div>
        {children}
      </div>
    </section>
  )
}

export default function Inicio() {
  const { estado, limpiezas, alertas, cargando } = useDatos()
  const [conteos, setConteos] = useState(null)
  useEffect(() => {
    api.contarTablas().then(setConteos).catch(() => setConteos(null))
  }, [])
  useRevelar(cargando)

  const stats = [
    { valor: estado.length, texto: 'coladeras monitoreadas' },
    { valor: limpiezas.filter((l) => l.pir_seguro).length, texto: 'limpiezas automáticas esta semana' },
    { valor: alertas.filter((a) => !alertaAbierta(a)).length, texto: 'alertas atendidas' },
    { valor: '< 2 s', texto: 'del sensor a la base de datos' },
  ]

  const ticker = (k) =>
    estado.map((c) => (
      <span key={`${k}-${c.id_coladera}`} className={`tk-item tk-${c.riesgo}`}>
        <i />
        <b>{c.codigo}</b> {c.colonia} · {c.obstruccion == null ? '—' : Math.round(c.obstruccion)}% · {RIESGO[c.riesgo]?.texto}
      </span>
    ))

  return (
    <div className="landing">
      <header className="l-nav">
        <div className="l-nav-in">
          <Logo claro={false} size={30} />
          <nav className="l-links" aria-label="Secciones">
            {SECCIONES.map(([id, t]) => (
              <a key={id} href={`#${id}`}>
                {t}
              </a>
            ))}
          </nav>
          <div className="l-nav-der">
            <TemaToggle />
            <Link to="/panel" className="l-btn l-btn-amarillo l-btn-sm">
              Ver panel <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="l-hero">
        <div className="l-lluvia" aria-hidden="true">
          {Array.from({ length: 80 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37.3) % 104}%`,
                height: `${50 + ((i * 13) % 60)}px`,
                opacity: 0.3 + ((i * 7) % 10) / 16,
                animationDuration: `${0.75 + ((i * 11) % 9) / 12}s`,
                animationDelay: `${-((i * 0.173) % 1.5).toFixed(2)}s`,
              }}
            />
          ))}
        </div>

        <div className="l-contenedor l-hero-in">
          <div className="l-hero-txt">
            <span className="l-ficha">[ Proyecto IoT · ODS 11 · Monterrey, N.L. ]</span>
            <h1>
              Coladeras que se limpian solas <Subrayado>antes</Subrayado> de que la ciudad se inunde.
            </h1>
            <p>
              <b>pluvIA</b> detecta la basura que tapa la rejilla, la retira con un rastrillo automático cuando es seguro hacerlo y avisa en tiempo real a quien da
              mantenimiento.
            </p>
            <div className="l-ctas">
              <Link to="/panel" className="l-btn l-btn-amarillo">
                Abrir panel en vivo <ArrowRight size={17} />
              </Link>
              <a href="#como-funciona" className="l-btn l-btn-contorno">
                Ver cómo funciona
              </a>
            </div>
          </div>

          <figure className="l-figura">
            <div className="l-figura-marco">
              <span className="esq esq-1" />
              <span className="esq esq-2" />
              <span className="esq esq-3" />
              <span className="esq esq-4" />
              <ColaderaDemo />
              <span className="l-marca" style={{ left: '50.5%', top: '17%' }}>
                A
              </span>
              <span className="l-marca" style={{ left: '87.8%', top: '27%' }}>
                B
              </span>
              <span className="l-marca" style={{ left: '11.5%', top: '56%' }}>
                C
              </span>
            </div>
            <figcaption>
              <span className="l-fig-titulo">Fig. 1 — Corte de la coladera, simulación en bucle</span>
              <ol>
                <li>
                  <b>A</b> Ultrasónico: mide la altura de la basura
                </li>
                <li>
                  <b>B</b> PIR: confirma que no haya nadie
                </li>
                <li>
                  <b>C</b> Servo: mueve el rastrillo
                </li>
              </ol>
            </figcaption>
            <span className="l-nota-mano" aria-hidden="true">
              ¡se limpia sola!
              <svg viewBox="0 0 90 60">
                <path d="M6 54 C 18 30, 44 14, 80 10" />
                <path d="M68 3 L 81 10 L 70 19" />
              </svg>
            </span>
          </figure>
        </div>

        <div className="l-contenedor">
          <dl className="l-stats">
            {stats.map((s) => (
              <div key={s.texto} data-revelar>
                <dt className="num">{cargando && typeof s.valor === 'number' ? '—' : <Contador valor={s.valor} />}</dt>
                <dd>{s.texto}</dd>
              </div>
            ))}
          </dl>
        </div>
        <CerroDeLaSilla />
        <span className="l-cerro-txt">Cerro de la Silla</span>
      </section>

      {/* ---------------- TICKER EN VIVO ---------------- */}
      <div className="l-ticker" aria-label="Estado en vivo de las coladeras">
        <span className="tk-vivo">
          <i /> En vivo
        </span>
        <div className="tk-pista">
          <div className="tk-cinta">
            {ticker('a')}
            {ticker('b')}
            {ticker('c')}
            {ticker('d')}
          </div>
        </div>
      </div>

      {/* ---------------- 01 PROBLEMA ---------------- */}
      <Seccion id="problema" n="01" nombre="El problema">
        <div className="l-split">
          <h2 className="l-h2" data-revelar>
            Una rejilla tapada convierte una lluvia normal en una <Subrayado retraso={0.2}>inundación</Subrayado>.
          </h2>
          <p className="l-lead" data-revelar>
            Basura, plásticos, hojas y ramas se acumulan sobre las coladeras y bloquean el flujo del agua. Es una de las principales causas de inundaciones urbanas en
            Monterrey, y hoy nadie se entera hasta que ya es tarde.
          </p>
        </div>
        <div className="l-tres">
          {[
            ['Obstrucción silenciosa', 'Los residuos se acumulan poco a poco y tapan el drenaje justo cuando más se necesita: durante la lluvia.'],
            ['Mantenimiento reactivo', 'La limpieza municipal ocurre solo ante emergencias, cuando el daño por el bloqueo ya sucedió.'],
            ['Cero visibilidad', 'No hay datos en tiempo real de cada coladera, así que no se puede priorizar ni prevenir.'],
          ].map(([t, p], i) => (
            <article key={t} data-revelar style={{ transitionDelay: `${i * 0.08}s` }}>
              <span className="l-mini">[ {String.fromCharCode(65 + i)} ]</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </Seccion>

      {/* ---------------- 02 CÓMO FUNCIONA (interactivo) ---------------- */}
      <Seccion id="como-funciona" n="02" nombre="Cómo funciona" oscuro>
        <div className="l-split l-split-bajo">
          <h2 className="l-h2" data-revelar>
            Del sensor al panel, en un <Subrayado retraso={0.2}>ciclo automático</Subrayado>.
          </h2>
          <p className="l-lead l-lead-claro" data-revelar>
            Elige un paso y mira cómo reacciona la coladera.
          </p>
        </div>
        <div data-revelar>
          <CicloInteractivo />
        </div>
      </Seccion>

      {/* ---------------- 03 LA RED ---------------- */}
      <Seccion id="red" n="03" nombre="La red" oscuro className="l-red">
        <div className="l-split l-split-bajo">
          <h2 className="l-h2" data-revelar>
            Cada coladera, <Subrayado retraso={0.2}>en vivo</Subrayado>.
          </h2>
          <p className="l-lead l-lead-claro" data-revelar>
            Pasa el cursor sobre una coladera para ver su estado. Los datos vienen de la misma base de datos que usa el panel.
          </p>
        </div>
        <div data-revelar>{estado.length ? <MapaRed estado={estado} /> : <div className="mapa mapa-cargando" />}</div>
        <div className="l-arq" data-revelar>
          {[
            ['Capa 1', 'Física y de bordes', 'ESP8266 + sensores y actuadores en la coladera'],
            ['Capa 2', 'Comunicación y datos', 'Wi-Fi → Supabase (PostgreSQL), 8 tablas en 3FN'],
            ['Capa 3', 'Aplicación', 'Este dashboard en React para mantenimiento preventivo'],
          ].map(([n, t, d], i) => (
            <div key={n} className="l-capa">
              <span className="l-mini">{n}</span>
              <strong>{t}</strong>
              <span>{d}</span>
              {i < 2 && <span className="l-capa-flecha">{i === 0 ? 'Wi-Fi · < 2 s' : 'Realtime'} →</span>}
            </div>
          ))}
        </div>
      </Seccion>

      {/* ---------------- 04 TECNOLOGÍA ---------------- */}
      <Seccion id="tecnologia" n="04" nombre="Tecnología">
        <div className="l-split">
          <h2 className="l-h2" data-revelar>
            Lista de componentes.
          </h2>
          <p className="l-lead" data-revelar>
            Una maqueta funcional a escala de una coladera pluvial automatizada: hardware accesible, datos en la nube y una interfaz para la ciudad.
          </p>
        </div>
        <div className="l-tabla-wrap" data-revelar>
          <table className="l-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Componente</th>
                <th>Modelo</th>
                <th>Tipo</th>
                <th>Función en el sistema</th>
              </tr>
            </thead>
            <tbody>
              {BOM.map(([c, m, t, f], i) => (
                <tr key={c}>
                  <td className="l-td-n">{String(i + 1).padStart(2, '0')}</td>
                  <td className="l-td-fuerte">{c}</td>
                  <td className="l-td-mono">{m}</td>
                  <td>
                    <span className={`l-tipo l-tipo-${t.toLowerCase()}`}>{t}</span>
                  </td>
                  <td className="l-td-sutil">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="l-split l-split-bajo" style={{ marginTop: 72 }}>
          <h3 className="l-h3" data-revelar>
            Modelo de datos
          </h3>
          <p className="l-lead" data-revelar>
            Cada coladera tiene dispositivos; cada dispositivo, sensores y actuadores. Las mediciones disparan alertas y las alertas pueden originar limpiezas. Los números
            son los registros actuales de cada tabla.
          </p>
        </div>
        <div data-revelar>
          <DiagramaDatos conteos={conteos} />
        </div>
        <div className="l-tabla-wrap" data-revelar style={{ marginTop: 18 }}>
          <table className="l-tabla">
            <thead>
              <tr>
                <th>Req.</th>
                <th>Qué pide</th>
                <th>Dónde se ve en la web</th>
              </tr>
            </thead>
            <tbody>
              {REQUERIMIENTOS.map(([id, r, d]) => (
                <tr key={id}>
                  <td className="l-td-mono l-td-fuerte">{id}</td>
                  <td>{r}</td>
                  <td className="l-td-ok">✓ {d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {/* ---------------- 05 EQUIPO ---------------- */}
      <Seccion id="equipo" n="05" nombre="Equipo">
        <div className="l-split">
          <h2 className="l-h2" data-revelar>
            Quiénes construimos pluvIA.
          </h2>
          <p className="l-lead" data-revelar>
            Implementación de internet de las cosas (TC1004B.504) · Tecnológico de Monterrey, Campus Monterrey · Prof. Enrique González Guerrero.
          </p>
        </div>
        <ol className="l-creditos">
          {EQUIPO.map(([n, r, req], i) => (
            <li key={n} data-revelar style={{ transitionDelay: `${i * 0.06}s` }}>
              <span className="l-cred-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="l-cred-nombre">{n}</span>
              <span className={`l-cred-rol ${r ? '' : 'l-pendiente'}`}>{r ?? 'Rol por definir'}</span>
              <span className="l-cred-req">{req}</span>
            </li>
          ))}
        </ol>
      </Seccion>

      {/* ---------------- CTA ---------------- */}
      <section className="l-senal">
        <div className="l-contenedor l-senal-in">
          <h2>
            Mira las coladeras
            <br />
            en tiempo real.
          </h2>
          <Link to="/panel" className="l-btn l-btn-negro">
            Abrir panel <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="l-footer">
        <div className="l-contenedor l-footer-in">
          <Logo size={30} />
          <span>Tecnológico de Monterrey · Implementación de internet de las cosas · 2026</span>
        </div>
      </footer>
    </div>
  )
}

function DiagramaDatos({ conteos }) {
  const cajas = {
    coladera: { x: 20, y: 120, color: 'var(--signal)' },
    dispositivo: { x: 225, y: 120, color: 'var(--ink)' },
    sensor: { x: 430, y: 30, color: 'var(--c-distancia)' },
    actuador: { x: 430, y: 210, color: 'var(--c-temperatura)' },
    medicion: { x: 635, y: 30, color: 'var(--c-humedad)' },
    tipoVariable: { x: 840, y: 30, color: 'var(--ink-3)' },
    accionLimpieza: { x: 635, y: 210, color: 'var(--ok-fill)' },
    alerta: { x: 840, y: 210, color: 'var(--crit-fill)' },
  }
  const W = 164
  const H = 62
  const der = (k) => [cajas[k].x + W, cajas[k].y + H / 2]
  const izq = (k) => [cajas[k].x, cajas[k].y + H / 2]
  const lineas = [
    { de: der('coladera'), a: izq('dispositivo'), t: '1:N' },
    { de: der('dispositivo'), a: izq('sensor'), t: '1:N' },
    { de: der('dispositivo'), a: izq('actuador'), t: '1:N' },
    { de: der('sensor'), a: izq('medicion'), t: '1:N' },
    { de: izq('tipoVariable'), a: der('medicion'), t: '1:N' },
    { de: der('actuador'), a: izq('accionLimpieza'), t: '1:N' },
    { de: izq('alerta'), a: der('accionLimpieza'), t: '0..1' },
    { de: [cajas.medicion.x + W / 2 + 40, cajas.medicion.y + H], a: [cajas.alerta.x + W / 2, cajas.alerta.y], t: '1:N' },
  ]
  return (
    <div className="l-diagrama">
      <svg viewBox="0 0 1024 300" role="img" aria-label="Diagrama del modelo relacional de pluvIA">
        <defs>
          <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
          </marker>
        </defs>
        {lineas.map((l, i) => {
          const [x1, y1] = l.de
          const [x2, y2] = l.a
          const mx = (x1 + x2) / 2
          const d = Math.abs(y1 - y2) < 2 ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.2" markerEnd="url(#punta)" />
              <text x={mx} y={(y1 + y2) / 2 - 7} textAnchor="middle" className="l-dg-card">
                {l.t}
              </text>
            </g>
          )
        })}
        {Object.entries(cajas).map(([k, c]) => (
          <g key={k} transform={`translate(${c.x} ${c.y})`}>
            <rect width={W} height={H} rx="2" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.2" />
            <rect width={W} height="6" fill={c.color} />
            <text x="12" y="32" className="l-dg-nombre">
              {TABLAS[k]}
            </text>
            <text x="12" y="50" className="l-dg-num">
              {conteos?.[k] == null ? '—' : conteos[k].toLocaleString('es-MX')} registros
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
