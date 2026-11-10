// Árbol que crece con la salud financiera (0–100).
export default function Arbol({ puntaje = 0 }) {
  const p = Math.max(0, Math.min(100, puntaje))
  const etapa = p < 15 ? 0 : p < 30 ? 1 : p < 50 ? 2 : p < 70 ? 3 : p < 85 ? 4 : 5
  // Hojas más amarillas/secas si la salud es baja
  const hoja = p < 30 ? '#a3a635' : p < 50 ? '#65a30d' : '#16a34a'
  const hoja2 = p < 30 ? '#ca8a04' : p < 50 ? '#4d7c0f' : '#15803d'
  const tronco = '#7c4a1e'
  const escala = etapa >= 3 ? 0.75 + (p - 50) / 200 : 1

  return (
    <svg viewBox="0 0 240 200" className="arbol" role="img" aria-label={`Árbol en etapa ${etapa + 1} de 6`}>
      {/* Montículo de tierra */}
      <ellipse cx="120" cy="186" rx="70" ry="12" fill="#92400e" opacity="0.85" />
      <ellipse cx="120" cy="182" rx="60" ry="8" fill="#a16207" opacity="0.7" />

      {etapa === 0 && (
        <g className="a-crecer">
          <ellipse cx="120" cy="176" rx="9" ry="6" fill="#78350f" />
          <path d="M120 172 q2 -8 6 -10" stroke="#65a30d" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {(etapa === 1 || etapa === 2) && (
        <g className="a-crecer a-mecer">
          <path d={etapa === 1 ? 'M120 180 q-2 -22 0 -40' : 'M120 180 q-3 -40 0 -80'} stroke="#4d7c0f" strokeWidth={etapa === 1 ? 4 : 5} fill="none" strokeLinecap="round" />
          <path d={etapa === 1 ? 'M120 150 q-18 -12 -24 -2 q12 10 24 2z' : 'M120 130 q-26 -16 -34 -2 q16 14 34 2z'} fill={hoja} />
          <path d={etapa === 1 ? 'M120 142 q18 -12 24 -2 q-12 10 -24 2z' : 'M120 118 q26 -16 34 -2 q-16 14 -34 2z'} fill={hoja2} />
          {etapa === 2 && <>
            <path d="M120 148 q-20 -6 -24 4 q12 6 24 -4z" fill={hoja2} />
            <path d="M120 104 q-10 -18 0 -24 q10 6 0 24z" fill={hoja} />
          </>}
        </g>
      )}

      {etapa >= 3 && (
        <g transform={`translate(120 186) scale(${escala}) translate(-120 -186)`}>
        <g className="a-crecer">
          <path d="M112 186 q4 -50 2 -90 l12 0 q-2 40 2 90z" fill={tronco} />
          <path d="M118 120 q-20 -14 -34 -12" stroke={tronco} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M122 110 q18 -16 32 -12" stroke={tronco} strokeWidth="6" fill="none" strokeLinecap="round" />
          <g className="a-mecer">
            <circle cx="120" cy="70" r={etapa === 3 ? 38 : 48} fill={hoja2} />
            <circle cx="88" cy="92" r={etapa === 3 ? 26 : 34} fill={hoja} />
            <circle cx="152" cy="90" r={etapa === 3 ? 26 : 34} fill={hoja} />
            <circle cx="104" cy="54" r={etapa === 3 ? 22 : 30} fill={hoja} />
            <circle cx="140" cy="56" r={etapa === 3 ? 22 : 30} fill={hoja2} />
            {etapa >= 4 && <><circle cx="70" cy="70" r="20" fill={hoja2} /><circle cx="170" cy="68" r="20" fill={hoja2} /></>}
            <ellipse cx="104" cy="48" rx="14" ry="7" fill="#fff" opacity="0.15" />
            {etapa >= 4 && (
              <g fill="#fbcfe8">
                {[[96, 70], [146, 78], [120, 40], [80, 96], [160, 100], [130, 96]].map(([x, y], i) => (
                  <g key={i} className="a-flor" style={{ animationDelay: `${i * 0.3}s` }}>
                    <circle cx={x} cy={y} r="4" /><circle cx={x} cy={y} r="1.6" fill="#facc15" />
                  </g>
                ))}
              </g>
            )}
            {etapa === 5 && (
              <g>
                {[[108, 84], [136, 62], [92, 56], [154, 84], [122, 100], [72, 78], [168, 74]].map(([x, y], i) => (
                  <g key={i} className="a-fruto" style={{ animationDelay: `${i * 0.25}s` }}>
                    <circle cx={x} cy={y} r="6.5" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
                    <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill="#854d0e">$</text>
                  </g>
                ))}
              </g>
            )}
          </g>
        </g>
        </g>
      )}
    </svg>
  )
}
