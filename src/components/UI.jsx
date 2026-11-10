import { useEffect, useState } from 'react'

export function Hoja({ titulo, onCerrar, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    document.body.classList.add('fijar')
    window.addEventListener('keydown', esc)
    return () => {
      document.body.classList.remove('fijar')
      window.removeEventListener('keydown', esc)
    }
  }, [onCerrar])
  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="hoja-cabecera">
          <h2>{titulo}</h2>
          <button className="btn-icono" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Formulario genérico.
 * campos: [{ nombre, etiqueta, tipo: 'texto'|'numero'|'select'|'fecha', opciones:[{valor, texto}], requerido, ayuda, min, max, paso }]
 */
export function Formulario({ campos, inicial, onGuardar, textoBoton = 'Guardar', onEliminar }) {
  const [valores, setValores] = useState(inicial)
  const [error, setError] = useState('')

  const cambiar = (c, v) => setValores((s) => ({ ...s, [c.nombre]: c.tipo === 'numero' ? (v === '' ? '' : Number(v)) : v }))

  const enviar = (e) => {
    e.preventDefault()
    const falta = campos.find((c) => c.requerido && (valores[c.nombre] === '' || valores[c.nombre] === undefined))
    if (falta) return setError(`Completa: ${falta.etiqueta}`)
    const negativo = campos.find((c) => c.tipo === 'numero' && valores[c.nombre] < 0)
    if (negativo) return setError(`${negativo.etiqueta} no puede ser negativo`)
    setError('')
    const limpio = { ...valores }
    campos.forEach((c) => {
      if (c.tipo === 'numero') limpio[c.nombre] = Number(limpio[c.nombre]) || 0
    })
    onGuardar(limpio)
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      {campos.map((c) =>
        c.oculto?.(valores) ? null : (
          <label key={c.nombre} className="campo">
            <span>{c.etiqueta}</span>
            {c.tipo === 'select' ? (
              <select value={valores[c.nombre] ?? ''} onChange={(e) => cambiar(c, e.target.value)}>
                {c.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.texto}</option>
                ))}
              </select>
            ) : (
              <input
                type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
                inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                step={c.paso ?? (c.tipo === 'numero' ? 'any' : undefined)}
                min={c.min}
                max={c.max}
                placeholder={c.placeholder}
                value={valores[c.nombre] ?? ''}
                onChange={(e) => cambiar(c, e.target.value)}
              />
            )}
            {c.ayuda && <small>{typeof c.ayuda === 'function' ? c.ayuda(valores) : c.ayuda}</small>}
          </label>
        )
      )}
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn btn-primario">{textoBoton}</button>
      {onEliminar && (
        <button type="button" className="btn btn-peligro" onClick={() => confirm('¿Eliminar este registro?') && onEliminar()}>
          Eliminar
        </button>
      )}
    </form>
  )
}

export function Tarjeta({ titulo, accion, children, className = '' }) {
  return (
    <section className={`tarjeta ${className}`}>
      {(titulo || accion) && (
        <div className="tarjeta-cabecera">
          {titulo && <h3>{titulo}</h3>}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

export function Vacio({ emoji, texto, accion }) {
  return (
    <div className="vacio">
      <span>{emoji}</span>
      <p>{texto}</p>
      {accion}
    </div>
  )
}

export function Dato({ etiqueta, valor, tono }) {
  return (
    <div className={`dato ${tono ?? ''}`}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  )
}
