// Gráficas SVG ligeras y animadas, sin dependencias.

export function Dona({ datos, centro, subtitulo, tamano = 160, grosor = 20 }) {
  const r = 70
  const c = 2 * Math.PI * r
  const suma = datos.reduce((t, d) => t + d.valor, 0) || 1
  let acumulado = 0
  return (
    <svg viewBox="0 0 180 180" width={tamano} height={tamano} role="img" aria-label={datos.map((d) => `${d.nombre}: ${Math.round((d.valor / suma) * 100)}%`).join(', ')}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--linea)" strokeWidth={grosor} />
      {datos.map((d, i) => {
        const largo = (d.valor / suma) * c
        const el = (
          <circle
            key={d.nombre}
            className="dona-segmento"
            style={{ '--largo': `${Math.max(largo - 3, 0.01)}px`, '--c': `${c}px`, animationDelay: `${i * 90}ms` }}
            cx="90" cy="90" r={r} fill="none"
            stroke={d.color} strokeWidth={grosor} strokeLinecap="round"
            strokeDasharray={`${Math.max(largo - 3, 0.01)} ${c}`}
            strokeDashoffset={-acumulado}
            transform="rotate(-90 90 90)"
          />
        )
        acumulado += largo
        return el
      })}
      <text x="90" y="90" textAnchor="middle" className="dona-centro">{centro}</text>
      {subtitulo && <text x="90" y="110" textAnchor="middle" className="dona-sub">{subtitulo}</text>}
    </svg>
  )
}

export function Barras({ datos, formato, alto = 150 }) {
  const max = Math.max(...datos.flatMap((d) => d.valores.map((v) => v.valor)), 1)
  const ancho = 320
  const grupo = ancho / datos.length
  const n = datos[0]?.valores.length || 1
  const barra = Math.min(16, (grupo - 14) / n)
  return (
    <svg viewBox={`0 0 ${ancho} ${alto + 24}`} className="grafica" role="img" aria-label="Gráfica de barras por mes">
      <line x1="0" x2={ancho} y1={alto} y2={alto} stroke="var(--linea)" />
      {datos.map((d, i) => (
        <g key={d.etiqueta} transform={`translate(${i * grupo + (grupo - barra * n) / 2},0)`}>
          {d.valores.map((v, j) => {
            const h = Math.max((v.valor / max) * (alto - 14), v.valor > 0 ? 3 : 0)
            return (
              <rect key={j} className="barra" style={{ animationDelay: `${i * 60 + j * 30}ms` }} x={j * barra} y={alto - h} width={barra - 3} height={h} rx="4" fill={v.color}>
                <title>{`${d.etiqueta}: ${formato(v.valor)}`}</title>
              </rect>
            )
          })}
          <text x={(barra * n) / 2} y={alto + 16} textAnchor="middle" className="eje">{d.etiqueta}</text>
        </g>
      ))}
    </svg>
  )
}

/** Gráfica de líneas. series: [{nombre, color, puntos:[number], punteada, area}] */
export function Lineas({ series, etiquetasX, formato, alto = 180 }) {
  const ancho = 320
  const izq = 46
  const n = Math.max(...series.map((s) => s.puntos.length), 2)
  const max = Math.max(...series.flatMap((s) => s.puntos), 1)
  const x = (i) => izq + (i / (n - 1)) * (ancho - izq - 8)
  const y = (v) => 8 + (1 - v / max) * (alto - 16)
  const marcas = [0, 0.5, 1].map((p) => max * p)
  const pasoX = Math.ceil(n / 5)
  return (
    <svg viewBox={`0 0 ${ancho} ${alto + 22}`} className="grafica" role="img" aria-label="Evolución de la deuda">
      <defs>
        {series.map((s, k) => (
          <linearGradient key={k} id={`area-${k}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity="0.35" />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {marcas.map((m) => (
        <g key={m}>
          <line x1={izq} x2={ancho} y1={y(m)} y2={y(m)} stroke="var(--linea)" strokeDasharray="3 4" />
          <text x={izq - 6} y={y(m) + 3} textAnchor="end" className="eje">{formato(m)}</text>
        </g>
      ))}
      {series.map((s, k) => {
        const pts = s.puntos.map((v, i) => `${x(i)},${y(v)}`).join(' ')
        return (
          <g key={s.nombre}>
            {s.area && <polygon className="area" points={`${x(0)},${y(0)} ${pts} ${x(s.puntos.length - 1)},${y(0)}`} fill={`url(#area-${k})`} />}
            <polyline
              className={s.punteada ? 'linea-punteada' : 'linea'}
              pathLength="1"
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={pts}
            />
          </g>
        )
      })}
      {etiquetasX?.map((e, i) =>
        i === etiquetasX.length - 1 || (i % pasoX === 0 && etiquetasX.length - 1 - i >= pasoX * 0.7) ? (
          <text key={i} x={x(i)} y={alto + 16} textAnchor="middle" className="eje">{e}</text>
        ) : null
      )}
    </svg>
  )
}

export function Progreso({ valor, max, color = 'var(--acento)', alerta = 'var(--rojo)', etiqueta }) {
  const p = max > 0 ? Math.min(valor / max, 1) : 0
  const pasado = max > 0 && valor > max
  return (
    <div className="progreso" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <div style={{ '--p': p, background: pasado ? alerta : color }} />
    </div>
  )
}

export function Leyenda({ items }) {
  return (
    <ul className="leyenda">
      {items.map((i) => (
        <li key={i.nombre}>
          <span className="punto" style={{ background: i.color }} />
          <span className="leyenda-nombre">{i.nombre}</span>
          {i.valor !== undefined && <strong>{i.valor}</strong>}
        </li>
      ))}
    </ul>
  )
}
