import { useEffect, useId, useState } from 'react'

/**
 * Corte transversal animado de la coladera, dibujado a partir de los datos reales:
 * altura de la basura (ultrasónico), lluvia (humedad), PIR, LED, rastrillo (servo) y día/noche (LDR).
 */
export default function ColaderaVisual({
  referencia = 40,
  umbral = 10,
  distancia = 30,
  lluvia = 0,
  presencia = false,
  limpiando = false,
  riesgo = 'normal',
  deDia = true,
  etiquetas = true,
  className = '',
}) {
  const uid = useId().replace(/:/g, '')
  const TOP = 64 // parte inferior del sensor
  const GRATE = 204 // superficie de la rejilla
  const H = GRATE - TOP
  const d = distancia == null ? referencia : Math.max(0, Math.min(referencia, distancia))
  const yBasura = TOP + (d / referencia) * H
  const yUmbral = TOP + (umbral / referencia) * H
  const alturaBasura = GRATE - yBasura
  const flujo = Math.max(0.15, 1 - alturaBasura / H)
  const inundacion = riesgo === 'critico' && lluvia > 0.2

  const led = { critico: '#ff4d6d', precaucion: '#ffb21e', normal: '#2ee6c8', 'sin-datos': '#6b7f8c' }[riesgo] ?? '#2ee6c8'
  const gotas = Math.round(lluvia * 34)

  // Contorno irregular de la pila de basura
  const bultos = [0, 14, 4, 18, 8, 2, 16, 6, 12, 0]
  const ancho = 204
  const pasos = bultos.length - 1
  const altVar = Math.min(12, alturaBasura * 0.35)
  let contorno = `M 78 ${GRATE} `
  bultos.forEach((b, i) => {
    const x = 78 + (ancho / pasos) * i
    const y = Math.min(GRATE, yBasura + (b / 18) * altVar)
    contorno += i === 0 ? `L ${x} ${y} ` : `Q ${x - ancho / pasos / 2} ${y - 6} ${x} ${y} `
  })
  contorno += `L 282 ${GRATE} Z`

  // Objetos dentro de la basura (solo los que caben bajo la superficie)
  const objetos = [
    { t: 'botella', x: 100, y: 188, r: -18 },
    { t: 'hoja', x: 150, y: 194, r: 25 },
    { t: 'bolsa', x: 215, y: 186, r: 0 },
    { t: 'hoja', x: 252, y: 178, r: -40 },
    { t: 'lata', x: 182, y: 168, r: 12 },
    { t: 'hoja', x: 118, y: 158, r: 60 },
    { t: 'botella', x: 238, y: 150, r: 30 },
    { t: 'bolsa', x: 140, y: 132, r: 0 },
    { t: 'hoja', x: 205, y: 120, r: -20 },
    { t: 'lata', x: 110, y: 104, r: -30 },
    { t: 'hoja', x: 250, y: 98, r: 40 },
  ].filter((o) => o.y - 6 > yBasura)

  return (
    <svg viewBox="0 0 360 300" className={`coladera-visual ${deDia ? '' : 'noche'} ${className}`} role="img" aria-label={`Coladera con ${Math.round((alturaBasura / H) * 100)}% de obstrucción`}>
      <defs>
        <linearGradient id={`cielo-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={deDia ? 'var(--sky-1, #cdeaf4)' : '#0a1d2b'} />
          <stop offset="1" stopColor={deDia ? 'var(--sky-2, #eef8fb)' : '#12303f'} />
        </linearGradient>
        <linearGradient id={`agua-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#0369a1" stopOpacity="0.95" />
        </linearGradient>
        <pattern id={`basura-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="14" height="14" fill="#7a5c3c" />
          <circle cx="3" cy="4" r="2" fill="#8e6c48" />
          <circle cx="10" cy="10" r="2.4" fill="#6a4e32" />
          <rect x="8" y="1" width="4" height="2" fill="#9b7a52" />
        </pattern>
        <radialGradient id={`led-${uid}`}>
          <stop offset="0" stopColor={led} stopOpacity="0.85" />
          <stop offset="1" stopColor={led} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`marco-${uid}`}>
          <rect x="0" y="0" width="360" height="300" rx="3" />
        </clipPath>
      </defs>

      <g clipPath={`url(#marco-${uid})`}>
        {/* cielo */}
        <rect width="360" height="300" fill={`url(#cielo-${uid})`} />
        {deDia ? (
          <g opacity="0.9">
            <circle cx="40" cy="40" r="14" fill="#ffd166" opacity={1 - lluvia * 0.7} />
          </g>
        ) : (
          <g>
            <circle cx="40" cy="40" r="12" fill="#e5eef3" />
            <circle cx="46" cy="36" r="11" fill="#0d2433" />
            {[[90, 30], [130, 52], [70, 70], [250, 24]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="1.2" fill="#cfe3ec" />
            ))}
          </g>
        )}
        {lluvia > 0.05 && (
          <g opacity={0.35 + lluvia * 0.4}>
            <ellipse cx="80" cy="18" rx="60" ry="16" fill="#9fb3bf" />
            <ellipse cx="160" cy="10" rx="70" ry="18" fill="#b2c3cc" />
            <ellipse cx="270" cy="16" rx="80" ry="18" fill="#9fb3bf" />
          </g>
        )}

        {/* lluvia */}
        <g className="lluvia">
          {Array.from({ length: gotas }, (_, i) => {
            const x = (i * 97) % 360
            return <line key={i} x1={x} y1={-20} x2={x - 3} y2={-8} style={{ animationDelay: `${((i * 0.137) % 1).toFixed(2)}s`, animationDuration: `${0.7 + ((i * 7) % 5) / 10}s` }} />
          })}
        </g>

        {/* banqueta y asfalto */}
        <rect x="0" y={GRATE - 4} width="70" height={300 - GRATE + 4} fill="#5b6b75" />
        <rect x="290" y={GRATE - 4} width="70" height={300 - GRATE + 4} fill="#5b6b75" />
        <rect x="0" y={GRATE - 4} width="70" height="5" fill="#76868f" />
        <rect x="290" y={GRATE - 4} width="70" height="5" fill="#76868f" />
        <rect x="300" y={GRATE - 24} width="60" height="22" fill="#8c9aa2" />

        {/* cámara de drenaje con agua */}
        <rect x="70" y={GRATE} width="220" height={300 - GRATE} fill="#13232c" />
        <g className="agua-flujo" style={{ animationDuration: `${2.6 / flujo}s` }} opacity={0.35 + flujo * 0.65}>
          <path d={`M 40 ${268 - flujo * 18} q 15 -6 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 V 300 H 40 Z`} fill={`url(#agua-${uid})`} />
        </g>

        {/* rejilla */}
        <rect x="70" y={GRATE} width="220" height="8" fill="#2e3d46" />
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={74 + i * 15.4} y={GRATE} width="9" height="8" fill="#8fa1ab" />
        ))}

        {/* basura */}
        {alturaBasura > 1 && (
          <g className="basura">
            <path d={contorno} fill={`url(#basura-${uid})`} />
            <path d={contorno} fill="none" stroke="#4d3826" strokeWidth="1.2" opacity="0.6" />
            {objetos.map((o, i) => (
              <g key={i} transform={`translate(${o.x} ${o.y}) rotate(${o.r})`}>
                {o.t === 'botella' && (
                  <>
                    <rect x="-12" y="-5" width="22" height="10" rx="4" fill="#7dd3c0" opacity="0.9" />
                    <rect x="10" y="-2.5" width="6" height="5" rx="1" fill="#2f9e85" />
                  </>
                )}
                {o.t === 'hoja' && <path d="M -10 0 Q 0 -9 10 0 Q 0 9 -10 0 Z" fill="#5c9e3f" />}
                {o.t === 'bolsa' && <path d="M -11 6 Q -13 -6 -4 -8 L 0 -12 L 4 -8 Q 13 -6 11 6 Z" fill="#e6e1d6" opacity="0.95" />}
                {o.t === 'lata' && <rect x="-5" y="-8" width="10" height="16" rx="2" fill="#d64545" />}
              </g>
            ))}
          </g>
        )}

        {/* inundación */}
        {inundacion && (
          <g className="charco">
            <path d={`M -10 ${GRATE - 14} q 20 -5 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 V ${GRATE + 2} H -10 Z`} fill="#38bdf8" opacity="0.45" />
          </g>
        )}

        {/* línea de umbral */}
        <line x1="74" x2="286" y1={yUmbral} y2={yUmbral} stroke="#ff4d6d" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.9" />
        {etiquetas && (
          <text x="76" y={yUmbral - 5} className="cv-label" fill="#ff4d6d">
            umbral {umbral} cm
          </text>
        )}

        {/* rastrillo + servo */}
        <rect x="26" y={GRATE - 40} width="34" height="22" rx="4" className="cv-caja" />
        <circle cx="52" cy={GRATE - 29} r="5" fill="#0ea5c6" className={limpiando ? 'servo-gira' : ''} />
        <g className={`rastrillo ${limpiando ? 'activo' : ''}`}>
          <rect x="56" y={GRATE - 31} width="34" height="4" rx="2" fill="#c5d2d9" />
          <rect x="86" y={GRATE - 34} width="5" height="30" rx="2" fill="#e2ebef" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={84 + i * 3} y={GRATE - 6} width="2" height="6" fill="#e2ebef" />
          ))}
        </g>

        {/* poste y brazo del sensor */}
        <rect x="312" y="36" width="7" height={GRATE - 60} className="cv-metal" />
        <rect x="190" y="36" width="129" height="6" rx="2" className="cv-metal" />
        <rect x="160" y="38" width="44" height="26" rx="6" className="cv-caja" />
        <circle cx="172" cy="60" r="5" className="cv-transductor" />
        <circle cx="192" cy="60" r="5" className="cv-transductor" />
        <circle cx="198" cy="45" r="11" fill={`url(#led-${uid})`} className={riesgo === 'critico' ? 'led-parpadeo' : ''} />
        <circle cx="198" cy="45" r="3" fill={led} className={riesgo === 'critico' ? 'led-parpadeo' : ''} />

        {/* haz ultrasónico */}
        <line x1="182" x2="182" y1={TOP + 2} y2={yBasura - 2} stroke="var(--c-distancia, #22c3e6)" strokeWidth="2" strokeDasharray="3 5" className="haz" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M 170 ${TOP + 8 + i * 9} Q 182 ${TOP + 14 + i * 9} 194 ${TOP + 8 + i * 9}`} fill="none" stroke="var(--c-distancia, #22c3e6)" strokeWidth="1.5" className="onda" style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
        {etiquetas && distancia != null && (
          <g transform={`translate(${yBasura - TOP > 46 ? 190 : 214} ${Math.max(TOP + 22, (TOP + yBasura) / 2 + 4)})`}>
            <rect x="0" y="-13" width="58" height="19" rx="9.5" className="cv-pastilla" />
            <text x="29" y="0.5" textAnchor="middle" className="cv-valor">
              {distancia.toFixed(1)} cm
            </text>
          </g>
        )}

        {/* PIR */}
        <g transform="translate(316 92)">
          <path d="M -9 0 A 9 9 0 0 1 9 0 Z" fill={presencia ? '#a78bfa' : '#d5dde2'} />
          {presencia &&
            [0, 1].map((i) => (
              <path key={i} d={`M -${16 + i * 8} 2 A ${16 + i * 8} ${16 + i * 8} 0 0 0 0 ${18 + i * 8}`} fill="none" stroke="#a78bfa" strokeWidth="1.6" className="onda" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
        </g>
        {etiquetas && (
          <text x="300" y="80" className="cv-label cv-etiqueta" textAnchor="end">
            PIR
          </text>
        )}
        {presencia && <Persona x={338} y={GRATE - 24} />}
      </g>
    </svg>
  )
}

function Persona({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} className="persona">
      <circle cx="0" cy="-58" r="7" fill="#f2c9a5" />
      <rect x="-8" y="-50" width="16" height="26" rx="6" fill="#7c3aed" />
      <rect x="-7" y="-26" width="6" height="26" rx="3" fill="#2d3a45" />
      <rect x="1" y="-26" width="6" height="26" rx="3" fill="#2d3a45" />
    </g>
  )
}

/** Versión que se anima sola en bucle (para la portada). */
export function ColaderaDemo(props) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % 140), 100)
    return () => clearInterval(id)
  }, [])
  // 0-90 se llena, 90-105 alguien pasa (PIR bloquea), 105-125 limpia, 125-140 vuelve a normal
  const llenado = Math.min(1, t / 90)
  let distancia = 38 - llenado * 30
  const presencia = t >= 92 && t < 106
  const limpiando = t >= 106 && t < 124
  if (t >= 118) distancia = 38
  const riesgo = distancia <= 10 ? 'critico' : distancia <= 22 ? 'precaucion' : 'normal'
  return <ColaderaVisual {...props} distancia={distancia} presencia={presencia} limpiando={limpiando} riesgo={riesgo} lluvia={0.55} />
}
