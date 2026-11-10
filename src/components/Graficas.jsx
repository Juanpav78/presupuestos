// Gráficas SVG ligeras, sin dependencias.

export function Dona({ datos, total, centro, subtitulo, tamano = 180 }) {
  const r = 70
  const c = 2 * Math.PI * r
  const suma = datos.reduce((t, d) => t + d.valor, 0) || 1
  let acumulado = 0
  return (
    <svg viewBox="0 0 180 180" width={tamano} height={tamano} role="img" aria-label="Distribución">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--linea)" strokeWidth="22" />
      {datos.map((d) => {
        const largo = (d.valor / suma) * c
        const el = (
          <circle
            key={d.nombre}
            cx="90" cy="90" r={r} fill="none"
            stroke={d.color} strokeWidth="22"
            strokeDasharray={`${Math.max(largo - 2, 0)} ${c}`}
            strokeDashoffset={-acumulado}
            transform="rotate(-90 90 90)"
          >
            <title>{d.nombre}</title>
          </circle>
        )
        acumulado += largo
        return el
      })}
      <text x="90" y="88" textAnchor="middle" className="dona-centro">{centro ?? total}</text>
      {subtitulo && <text x="90" y="108" textAnchor="middle" className="dona-sub">{subtitulo}</text>}
    </svg>
  )
}

export function Barras({ datos, formato, alto = 160 }) {
  const max = Math.max(...datos.flatMap((d) => d.valores.map((v) => v.valor)), 1)
  const ancho = 320
  const grupo = ancho / datos.length
  const n = datos[0]?.valores.length || 1
  const barra = Math.min(22, (grupo - 12) / n)
  return (
    <svg viewBox={`0 0 ${ancho} ${alto + 24}`} className="grafica" role="img">
      <line x1="0" x2={ancho} y1={alto} y2={alto} stroke="var(--linea)" />
      {datos.map((d, i) => (
        <g key={d.etiqueta} transform={`translate(${i * grupo + (grupo - barra * n) / 2},0)`}>
          {d.valores.map((v, j) => {
            const h = (v.valor / max) * (alto - 18)
            return (
              <rect key={j} x={j * barra} y={alto - h} width={barra - 2} height={h} rx="3" fill={v.color}>
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

/** Gráfica de líneas. series: [{nombre, color, puntos:[number]}] */
export function Lineas({ series, etiquetasX, formato, alto = 180 }) {
  const ancho = 320
  const izq = 44
  const n = Math.max(...series.map((s) => s.puntos.length), 2)
  const max = Math.max(...series.flatMap((s) => s.puntos), 1)
  const x = (i) => izq + (i / (n - 1)) * (ancho - izq - 8)
  const y = (v) => 8 + (1 - v / max) * (alto - 16)
  const marcas = [0, 0.5, 1].map((p) => max * p)
  const pasoX = Math.ceil(n / 6)
  return (
    <svg viewBox={`0 0 ${ancho} ${alto + 22}`} className="grafica" role="img">
      {marcas.map((m) => (
        <g key={m}>
          <line x1={izq} x2={ancho} y1={y(m)} y2={y(m)} stroke="var(--linea)" strokeDasharray="3 3" />
          <text x={izq - 4} y={y(m) + 3} textAnchor="end" className="eje">{formato(m)}</text>
        </g>
      ))}
      {series.map((s) => (
        <polyline
          key={s.nombre}
          fill="none"
          stroke={s.color}
          strokeWidth="2.5"
          strokeDasharray={s.punteada ? '5 4' : undefined}
          strokeLinejoin="round"
          points={s.puntos.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        />
      ))}
      {etiquetasX?.map((e, i) =>
        i === etiquetasX.length - 1 || (i % pasoX === 0 && etiquetasX.length - 1 - i >= pasoX * 0.7) ? (
          <text key={i} x={x(i)} y={alto + 16} textAnchor="middle" className="eje">{e}</text>
        ) : null
      )}
    </svg>
  )
}

export function Progreso({ valor, max, color = 'var(--primario)', alerta = 'var(--rojo)' }) {
  const p = max > 0 ? Math.min(valor / max, 1) : 0
  const pasado = max > 0 && valor > max
  return (
    <div className="progreso">
      <div style={{ width: `${p * 100}%`, background: pasado ? alerta : color }} />
    </div>
  )
}

export function Leyenda({ items }) {
  return (
    <ul className="leyenda">
      {items.map((i) => (
        <li key={i.nombre}>
          <span className="punto" style={{ background: i.color }} />
          {i.nombre}
          {i.valor !== undefined && <strong>{i.valor}</strong>}
        </li>
      ))}
    </ul>
  )
}
