import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ColaderaVisual from './ColaderaVisual'
import { Medidor, RiesgoBadge } from './ui'
import { RIESGO } from '../utils/dominio'
import { haceCuanto, norm } from '../utils/format'

/* ------------------------------------------------------------------
   Subrayado a mano que se dibuja solo
   ------------------------------------------------------------------ */
export function Subrayado({ children, retraso = 0.5 }) {
  return (
    <span className="subrayado">
      {children}
      <svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 15 C 38 7, 92 5, 132 9 S 182 16, 196 7" style={{ animationDelay: `${retraso}s` }} />
      </svg>
    </span>
  )
}

/* ------------------------------------------------------------------
   Número que cuenta hacia arriba cuando aparece en pantalla
   ------------------------------------------------------------------ */
export function Contador({ valor, dur = 1300 }) {
  const ref = useRef(null)
  const [v, setV] = useState(typeof valor === 'number' ? 0 : valor)
  useEffect(() => {
    if (typeof valor !== 'number') return setV(valor)
    const el = ref.current
    let raf
    const animar = () => {
      const t0 = performance.now()
      const paso = (t) => {
        const p = Math.min(1, (t - t0) / dur)
        setV(Math.round(valor * (1 - Math.pow(1 - p, 3))))
        if (p < 1) raf = requestAnimationFrame(paso)
      }
      raf = requestAnimationFrame(paso)
    }
    if (!('IntersectionObserver' in window) || !el) {
      setV(valor)
      return
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        animar()
        io.disconnect()
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [valor, dur])
  return <span ref={ref}>{v}</span>
}

/* ------------------------------------------------------------------
   Silueta del Cerro de la Silla (identidad local)
   ------------------------------------------------------------------ */
export function CerroDeLaSilla({ className = '' }) {
  return (
    <svg className={`cerro ${className}`} viewBox="0 0 1440 170" preserveAspectRatio="none" aria-hidden="true">
      <path
        className="cerro-lejos"
        d="M0 170 V128 C90 118 170 104 250 108 C330 112 390 92 470 96 C550 100 610 118 690 112 C770 106 840 84 900 70 C930 64 960 72 990 88 C1030 106 1070 100 1110 86 C1180 62 1260 92 1340 104 C1390 110 1420 112 1440 114 V170 Z"
      />
      <path
        className="cerro-cerca"
        d="M0 170 V150 C200 146 420 140 560 128 C680 118 760 96 820 60 C850 40 868 22 885 20 C902 18 925 44 950 72 C968 92 1010 98 1030 84 C1050 68 1068 24 1088 12 C1104 4 1120 18 1140 40 C1180 84 1250 116 1330 130 C1380 138 1420 142 1440 144 V170 Z"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------
   Ciclo interactivo: eliges un paso y la coladera reacciona
   ------------------------------------------------------------------ */
const PASOS = [
  {
    titulo: 'Mide',
    texto: 'Cada pocos segundos el ESP8266 lee la distancia a la basura, la humedad, la temperatura, la luz y si hay alguien cerca.',
    dato: 'JSN-SR04T · DHT22 · LDR · PIR',
  },
  {
    titulo: 'Detecta',
    texto: 'Cuando la basura queda a menos de 10 cm del sensor, el sistema genera una alerta de obstrucción crítica.',
    dato: 'distancia < umbral → alerta',
  },
  {
    titulo: 'Verifica y limpia',
    texto: 'Antes de moverse, el PIR confirma que no hay personas ni animales. Si la zona está libre, el servo activa el rastrillo.',
    dato: 'PIR libre → servo + LED',
  },
  {
    titulo: 'Reporta',
    texto: 'Mediciones, alertas y limpiezas llegan a Supabase en menos de 2 s y aparecen en el panel en tiempo real.',
    dato: 'Supabase Realtime · < 2 s',
  },
]
const DURACION = 6500

export function CicloInteractivo() {
  const [paso, setPaso] = useState(0)
  const [t, setT] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 100), 100)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (auto && t >= DURACION) {
      setPaso((p) => (p + 1) % PASOS.length)
      setT(0)
    }
  }, [t, auto])

  const elegir = (i) => {
    setPaso(i)
    setT(0)
    setAuto(false)
  }

  // Estado de la ilustración según el paso
  let distancia = 30 + Math.sin(t / 600) * 0.4
  let presencia = false
  let limpiando = false
  let tarjeta = null
  if (paso === 0) {
    tarjeta = (
      <div className="ciclo-card">
        <span className="ciclo-card-tag">Lectura · CI-MTY-001</span>
        <dl className="ciclo-lecturas">
          <div><dt>Distancia</dt><dd>{distancia.toFixed(1)} cm</dd></div>
          <div><dt>Humedad</dt><dd>88 %</dd></div>
          <div><dt>Luz</dt><dd>41 % · día</dd></div>
          <div><dt>PIR</dt><dd>Libre</dd></div>
        </dl>
      </div>
    )
  } else if (paso === 1) {
    distancia = Math.max(8.6, 16 - (t / 2000) * 7.4)
    tarjeta =
      distancia <= 10 ? (
        <div className="ciclo-card alerta" key="a">
          <span className="ciclo-card-tag crit">Alta</span>
          <strong>Obstrucción crítica</strong>
          <span>{distancia.toFixed(1)} cm &lt; umbral de 10 cm</span>
        </div>
      ) : null
  } else if (paso === 2) {
    distancia = t < 4200 ? 8.6 : 38
    presencia = t < 2200
    limpiando = t >= 2200 && t < 5000
    tarjeta = presencia ? (
      <div className="ciclo-card espera" key="e">
        <span className="ciclo-card-tag warn">En espera</span>
        <strong>Persona detectada</strong>
        <span>El rastrillo no se mueve hasta que la zona esté libre.</span>
      </div>
    ) : (
      <div className="ciclo-card ok" key="o">
        <span className="ciclo-card-tag ok">Seguro</span>
        <strong>{limpiando ? 'Rastrillo en movimiento' : 'Rejilla despejada'}</strong>
        <span>{limpiando ? 'El servomotor retira la basura.' : 'Limpieza completada en 12 s.'}</span>
      </div>
    )
  } else {
    distancia = 38
    const lineas = [
      ['INSERT', 'Medicion #48213', '0.4 s'],
      ['UPDATE', 'Alerta #91 → resuelta', '0.6 s'],
      ['INSERT', 'AccionLimpieza #215 · exitosa', '0.8 s'],
    ]
    tarjeta = (
      <div className="ciclo-card log">
        <span className="ciclo-card-tag">Supabase · tiempo real</span>
        {lineas.map(([op, txt, ms], i) =>
          t > 300 + i * 900 ? (
            <div key={i} className="ciclo-log">
              <b>{op}</b> <span>{txt}</span> <i>{ms}</i>
            </div>
          ) : null,
        )}
      </div>
    )
  }
  const riesgo = distancia <= 10 ? 'critico' : distancia <= 22 ? 'precaucion' : 'normal'

  return (
    <div className="ciclo">
      <ol className="ciclo-pasos">
        {PASOS.map((p, i) => {
          const activo = i === paso
          return (
            <li key={p.titulo} className={activo ? 'activo' : ''}>
              <button onClick={() => elegir(i)} aria-expanded={activo}>
                <span className="ciclo-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="ciclo-titulo">{p.titulo}</span>
                <span className="ciclo-mas" aria-hidden="true">
                  [{activo ? '−' : '+'}]
                </span>
              </button>
              <div className="ciclo-cuerpo">
                <div>
                  <p>{p.texto}</p>
                  <span className="ciclo-dato">{p.dato}</span>
                </div>
              </div>
              {activo && auto && <span className="ciclo-progreso" style={{ transform: `scaleX(${Math.min(1, t / DURACION)})` }} />}
            </li>
          )
        })}
      </ol>
      <div className="ciclo-visual">
        <ColaderaVisual distancia={distancia} presencia={presencia} limpiando={limpiando} riesgo={riesgo} lluvia={0.5} />
        <div className="ciclo-overlay">{tarjeta}</div>
        <span className="ciclo-fig">Fig. 2 — Simulación del ciclo · paso {paso + 1} de 4</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Mapa esquemático de la red (ubicación aproximada por colonia/municipio)
   ------------------------------------------------------------------ */
const POSICIONES = {
  centro: [470, 225],
  tecnologico: [520, 345],
  'del valle': [320, 362],
  contry: [612, 388],
  'linda vista': [705, 235],
  anahuac: [448, 112],
  monterrey: [480, 250],
  'san pedro garza garcia': [320, 370],
  guadalupe: [700, 250],
  'san nicolas de los garza': [460, 110],
  apodaca: [730, 95],
  'santa catarina': [150, 360],
  escobedo: [380, 50],
}

function semilla(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function useCiudad() {
  return useMemo(() => {
    const r = semilla(7)
    const barrios = [
      [470, 230, 150], [520, 360, 120], [320, 370, 150], [620, 395, 110], [705, 240, 140], [450, 110, 140],
      [180, 330, 120], [820, 140, 130], [850, 420, 120], [250, 140, 120], [620, 120, 110],
    ].map(([cx, cy, rad]) => ({ cx, cy, rad, ang: r() * 60 - 30, paso: 13 + r() * 6 }))
    const avenidas = Array.from({ length: 9 }, () => {
      const y0 = r() * 520
      const y1 = r() * 520
      return `M -20 ${y0.toFixed(0)} C 300 ${(y0 + (r() - 0.5) * 200).toFixed(0)}, 700 ${(y1 + (r() - 0.5) * 200).toFixed(0)}, 1020 ${y1.toFixed(0)}`
    }).concat(
      Array.from({ length: 6 }, () => {
        const x0 = r() * 1000
        const x1 = r() * 1000
        return `M ${x0.toFixed(0)} -20 C ${(x0 + (r() - 0.5) * 200).toFixed(0)} 200, ${(x1 + (r() - 0.5) * 200).toFixed(0)} 340, ${x1.toFixed(0)} 540`
      }),
    )
    return { barrios, avenidas }
  }, [])
}

export function MapaRed({ estado }) {
  const { barrios, avenidas } = useCiudad()
  const [sel, setSel] = useState(null)

  const puntos = estado.map((c, i) => {
    const base = POSICIONES[norm(c.colonia)] ?? POSICIONES[norm(c.municipio)] ?? [500 + Math.cos(i * 1.7) * 160, 260 + Math.sin(i * 1.7) * 120]
    return { c, x: base[0], y: base[1] }
  })
  const porDefecto = [...puntos].sort((a, b) => (b.c.obstruccion ?? -1) - (a.c.obstruccion ?? -1))[0]
  const activo = puntos.find((p) => p.c.id_coladera === sel) ?? porDefecto
  const colorRiesgo = { critico: '#ff4d6d', precaucion: '#ffb21e', normal: '#2ec4b0', 'sin-datos': '#7b7870' }

  return (
    <div className="mapa">
      <svg viewBox="0 0 1000 520" className="mapa-svg" role="img" aria-label="Mapa esquemático de las coladeras de la red">
        <defs>
          <radialGradient id="desvanecer">
            <stop offset="0.55" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          {barrios.map((b, i) => (
            <mask id={`barrio-${i}`} key={i}>
              <circle cx={b.cx} cy={b.cy} r={b.rad} fill="url(#desvanecer)" />
            </mask>
          ))}
        </defs>
        <rect width="1000" height="520" className="mapa-fondo" />
        {barrios.map((b, i) => {
          const n = Math.ceil((b.rad * 2) / b.paso)
          return (
            <g key={i} mask={`url(#barrio-${i})`}>
              <g transform={`rotate(${b.ang} ${b.cx} ${b.cy})`} className="mapa-calles">
                {Array.from({ length: n + 1 }, (_, k) => {
                  const o = -b.rad + k * b.paso
                  return (
                    <g key={k}>
                      <line x1={b.cx - b.rad} x2={b.cx + b.rad} y1={b.cy + o} y2={b.cy + o} />
                      <line x1={b.cx + o} x2={b.cx + o} y1={b.cy - b.rad} y2={b.cy + b.rad} />
                    </g>
                  )
                })}
              </g>
            </g>
          )
        })}
        {avenidas.map((d, i) => (
          <path key={i} d={d} className="mapa-avenida" />
        ))}
        <path d="M -20 300 C 140 290, 260 318, 400 300 S 640 272, 760 286 S 940 300, 1020 282" className="mapa-rio" />
        <text x="140" y="322" className="mapa-rio-txt">Río Santa Catarina</text>
        {[
          ['San Nicolás', 470, 44],
          ['Monterrey', 380, 205],
          ['Guadalupe', 760, 205],
          ['San Pedro', 230, 430],
        ].map(([t, x, y]) => (
          <text key={t} x={x} y={y} className="mapa-municipio">
            {t}
          </text>
        ))}

        {puntos.map(({ c, x, y }) => {
          const color = colorRiesgo[c.riesgo] ?? colorRiesgo['sin-datos']
          const es = activo?.c.id_coladera === c.id_coladera
          return (
            <g
              key={c.id_coladera}
              className={`mapa-punto ${es ? 'activo' : ''}`}
              transform={`translate(${x} ${y})`}
              tabIndex={0}
              role="button"
              aria-label={`${c.codigo}, ${RIESGO[c.riesgo]?.texto}`}
              onMouseEnter={() => setSel(c.id_coladera)}
              onFocus={() => setSel(c.id_coladera)}
              onClick={() => setSel(c.id_coladera)}
            >
              {c.riesgo === 'critico' && <circle r="10" className="mapa-pulso" style={{ stroke: color }} />}
              <rect x="-7" y="-7" width="14" height="14" fill={color} className="mapa-cuadro" />
              <text x="13" y="4" className="mapa-codigo">
                {c.codigo}
              </text>
            </g>
          )
        })}
      </svg>

      {activo && (
        <div
          className="mapa-card"
          style={{
            left: `${(activo.x / 1000) * 100}%`,
            top: `${(activo.y / 520) * 100}%`,
            transform: `translate(${activo.x > 620 ? 'calc(-100% - 22px)' : '22px'}, -50%)`,
          }}
          key={activo.c.id_coladera}
        >
          <div className="mapa-card-top">
            <span className="mapa-card-tag">{activo.c.codigo}</span>
            <RiesgoBadge riesgo={activo.c.riesgo} />
          </div>
          <strong>{activo.c.calle}</strong>
          <span className="mapa-card-sub">
            {activo.c.colonia}, {activo.c.municipio}
          </span>
          <div className="mapa-card-nivel">
            <b>{activo.c.obstruccion == null ? '—' : Math.round(activo.c.obstruccion)}%</b>
            <span>obstrucción · {haceCuanto(activo.c.ultimaLectura)}</span>
          </div>
          <Medidor
            pct={activo.c.obstruccion}
            riesgo={activo.c.riesgo}
            umbralPct={((activo.c.distancia_referencia_cm - activo.c.umbral_obstruccion_cm) / activo.c.distancia_referencia_cm) * 100}
          />
          <Link to={`/panel/coladeras/${activo.c.id_coladera}`} className="mapa-card-link">
            Ver en el panel <ArrowRight size={13} />
          </Link>
        </div>
      )}
      <span className="mapa-nota">Esquema · ubicación aproximada por colonia</span>
    </div>
  )
}

/* ------------------------------------------------------------------
   Revela elementos con [data-revelar] al hacer scroll
   ------------------------------------------------------------------ */
export function useRevelar(dep) {
  useEffect(() => {
    const els = document.querySelectorAll('[data-revelar]:not(.visible)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('visible'))
      return
    }
    const io = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [dep])
}
