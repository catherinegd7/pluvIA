import { Link } from 'react-router-dom'

/**
 * Isotipo de pluvIA: gota mitad agua (pluvia) y mitad circuito (IA / IoT).
 * Archivos en /public: logo-pluvia-sm.png (128 px de alto) y logo-pluvia.png (512 px).
 */
export function LogoMark({ size = 32, className = '' }) {
  const src = size > 64 ? '/logo-pluvia.png' : '/logo-pluvia-sm.png'
  return <img src={src} alt="" width={Math.round(size * 0.735)} height={size} className={`logo-mark ${className}`} draggable="false" />
}

export function Logo({ claro = true, size = 34, to = '/' }) {
  return (
    <Link to={to} className={`logo ${claro ? 'logo-claro' : ''}`} aria-label="pluvIA, inicio">
      <LogoMark size={size} />
      <span className="logo-txt">
        pluv<b>IA</b>
      </span>
    </Link>
  )
}
