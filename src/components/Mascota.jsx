// Mascota original (una criaturita redonda) dibujada en SVG. Su cara y animación cambian con el estado.
import { useId } from 'react'
import { color as colorTarjeta } from '../lib/format'

export default function Mascota({ estado = 'tranquilo', colorKey = 'oro', tamano = 96, saltando }) {
  const id = useId().replace(/:/g, '')
  const c = colorTarjeta(colorKey)
  const enfermo = estado === 'enfermo'
  const feliz = ['feliz', 'celebrando', 'libre'].includes(estado)

  // Ojos
  const ojos = (() => {
    if (feliz) return (
      <g stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M40 58 q6 -8 12 0" /><path d="M68 58 q6 -8 12 0" />
      </g>
    )
    if (enfermo) return (
      <g stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round">
        <path d="M41 52 l10 10 M51 52 l-10 10" /><path d="M69 52 l10 10 M79 52 l-10 10" />
      </g>
    )
    return (
      <g className="m-ojos">
        <ellipse cx="46" cy="57" rx="7" ry="8" fill="#fff" /><ellipse cx="74" cy="57" rx="7" ry="8" fill="#fff" />
        <circle cx={estado === 'preocupado' ? 45 : 47} cy="58" r="4" fill="#1a1a1a" /><circle cx={estado === 'preocupado' ? 73 : 75} cy="58" r="4" fill="#1a1a1a" />
        <circle cx="48.5" cy="56" r="1.4" fill="#fff" /><circle cx="76.5" cy="56" r="1.4" fill="#fff" />
      </g>
    )
  })()

  // Boca
  const boca = {
    celebrando: <path d="M48 72 q12 16 24 0 z" fill="#7f1d1d" stroke="#1a1a1a" strokeWidth="2.5" strokeLinejoin="round" />,
    libre: <path d="M48 72 q12 14 24 0" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />,
    feliz: <path d="M49 72 q11 11 22 0" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />,
    tranquilo: <path d="M52 74 q8 5 16 0" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />,
    preocupado: <path d="M51 78 q9 -7 18 0" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />,
    enfermo: <path d="M50 77 q5 -4 10 0 q5 4 10 0" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />,
  }[estado]

  return (
    <svg
      viewBox="0 0 120 120" width={tamano} height={tamano}
      className={`mascota m-${estado} ${saltando ? 'saltar' : ''}`}
      role="img" aria-label={`Mascota ${estado}`}
    >
      <defs>
        <radialGradient id={`cuerpo-${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={c.a} />
          <stop offset="1" stopColor={c.b} />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="110" rx="30" ry="5" fill="#000" opacity="0.15" className="m-sombra" />
      <g className="m-cuerpo">
        {/* Antenitas */}
        <path d="M45 26 q-6 -14 -14 -12" stroke={c.b} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M75 26 q6 -14 14 -12" stroke={c.b} strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="31" cy="14" r="5" fill={estado === 'libre' ? '#FACC15' : c.a} />
        <circle cx="89" cy="14" r="5" fill={estado === 'libre' ? '#FACC15' : c.a} />
        {/* Patitas */}
        <ellipse cx="44" cy="104" rx="10" ry="6" fill={c.b} />
        <ellipse cx="76" cy="104" rx="10" ry="6" fill={c.b} />
        {/* Brazos (arriba si celebra) */}
        {estado === 'celebrando' || estado === 'libre'
          ? <><path d="M22 66 q-10 -14 -4 -24" stroke={c.b} strokeWidth="8" fill="none" strokeLinecap="round" /><path d="M98 66 q10 -14 4 -24" stroke={c.b} strokeWidth="8" fill="none" strokeLinecap="round" /></>
          : <><path d="M22 70 q-8 8 -4 16" stroke={c.b} strokeWidth="8" fill="none" strokeLinecap="round" /><path d="M98 70 q8 8 4 16" stroke={c.b} strokeWidth="8" fill="none" strokeLinecap="round" /></>}
        {/* Cuerpo */}
        <path d="M60 22 C90 22 102 48 101 70 C100 94 84 106 60 106 C36 106 20 94 19 70 C18 48 30 22 60 22 Z" fill={`url(#cuerpo-${id})`} />
        <ellipse cx="60" cy="86" rx="24" ry="16" fill="#fff" opacity="0.22" />
        {enfermo && <path d="M60 22 C90 22 102 48 101 70 C100 94 84 106 60 106 C36 106 20 94 19 70 C18 48 30 22 60 22 Z" fill="#84cc16" opacity="0.35" />}
        <ellipse cx="44" cy="34" rx="10" ry="5" fill="#fff" opacity="0.35" transform="rotate(-20 44 34)" />
        {/* Cara */}
        {estado === 'preocupado' && <g stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"><path d="M38 44 l12 4" /><path d="M82 44 l-12 4" /></g>}
        {ojos}
        {(feliz || estado === 'tranquilo') && <><ellipse cx="34" cy="70" rx="7" ry="4" fill="#fb7185" opacity="0.55" /><ellipse cx="86" cy="70" rx="7" ry="4" fill="#fb7185" opacity="0.55" /></>}
        {boca}
        {/* Extras por estado */}
        {estado === 'preocupado' && <path className="m-gota" d="M92 40 q5 8 0 12 q-5 -4 0 -12z" fill="#60a5fa" />}
        {enfermo && (
          <g>
            <rect x="66" y="74" width="26" height="5" rx="2.5" fill="#e5e7eb" stroke="#9ca3af" transform="rotate(-18 66 76)" />
            <circle cx="91" cy="68" r="3.5" fill="#ef4444" />
            <rect x="26" y="30" width="22" height="8" rx="3" fill="#fde68a" transform="rotate(-25 37 34)" />
          </g>
        )}
        {estado === 'libre' && <path d="M42 18 l6 -12 l6 8 l6 -10 l6 10 l6 -8 l6 12 z" fill="#FACC15" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />}
      </g>
      {estado === 'celebrando' && (
        <g className="m-corazones" fill="#ec4899">
          <path d="M14 30 c-4 -6 4 -10 6 -4 c2 -6 10 -2 6 4 l-6 6z" />
          <path d="M96 22 c-3 -5 3 -8 5 -3 c2 -5 8 -2 5 3 l-5 5z" />
          <path d="M104 52 c-3 -4 3 -7 4 -3 c1 -4 7 -1 4 3 l-4 4z" />
        </g>
      )}
      {(estado === 'feliz' || estado === 'libre') && (
        <g className="m-brillos" fill="#FACC15">
          <path d="M12 46 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" />
          <path d="M106 34 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z" />
        </g>
      )}
    </svg>
  )
}
