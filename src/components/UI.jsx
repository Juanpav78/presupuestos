import { useEffect, useRef, useState, useId } from 'react'
import { LuX, LuTrash2, LuCheck } from 'react-icons/lu'
import { COLORES, degradado } from '../lib/format'

const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ---------- Hoja inferior (modal) ----------
export function Hoja({ titulo, subtitulo, onCerrar, children }) {
  const [saliendo, setSaliendo] = useState(false)
  const ref = useRef()
  const idTitulo = useId()

  const cerrar = () => {
    if (reducido()) return onCerrar()
    setSaliendo(true)
    setTimeout(onCerrar, 200)
  }

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && cerrar()
    document.body.classList.add('fijar')
    window.addEventListener('keydown', esc)
    const anterior = document.activeElement
    ref.current?.querySelector('input, select, button:not(.btn-cerrar)')?.focus({ preventScroll: true })
    return () => {
      document.body.classList.remove('fijar')
      window.removeEventListener('keydown', esc)
      anterior?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div className={`hoja-fondo ${saliendo ? 'saliendo' : ''}`} onClick={cerrar}>
      <div ref={ref} className="hoja" role="dialog" aria-modal="true" aria-labelledby={idTitulo} onClick={(e) => e.stopPropagation()}>
        <div className="hoja-asa" aria-hidden="true" />
        <div className="hoja-cabecera">
          <div>
            <h2 id={idTitulo}>{titulo}</h2>
            {subtitulo && <p className="nota">{subtitulo}</p>}
          </div>
          <button className="btn-icono btn-cerrar" onClick={cerrar} aria-label="Cerrar">
            <LuX />
          </button>
        </div>
        {typeof children === 'function' ? children(cerrar) : children}
      </div>
    </div>
  )
}

// ---------- Entrada de dinero con separador de miles ----------
const fmtMiles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
export function CampoMonto({ value, onChange, placeholder = '0', grande, ...resto }) {
  const [texto, setTexto] = useState(value === '' || value === undefined ? '' : fmtMiles.format(value))
  useEffect(() => {
    const actual = Number(texto.replace(/\./g, '').replace(',', '.'))
    if (value !== actual && !(value === '' && texto === '')) setTexto(value === '' || value === undefined ? '' : fmtMiles.format(value))
  }, [value])
  const cambiar = (e) => {
    let t = e.target.value.replace(/[^0-9,]/g, '')
    const [ent, dec] = t.split(',')
    const n = ent ? Number(ent) : 0
    const nuevo = t === '' ? '' : fmtMiles.format(n) + (t.includes(',') ? ',' + (dec ?? '').slice(0, 2) : '')
    setTexto(nuevo)
    onChange(t === '' ? '' : Number(`${n}.${dec || 0}`))
  }
  return (
    <div className={`campo-monto ${grande ? 'grande' : ''}`}>
      <span aria-hidden="true">$</span>
      <input inputMode="decimal" autoComplete="off" placeholder={placeholder} value={texto} onChange={cambiar} style={grande ? { width: `${Math.max(texto.length, 1) * 0.6 + 0.4}em` } : undefined} {...resto} />
    </div>
  )
}

// ---------- Selector segmentado ----------
export function Segmentado({ opciones, valor, onChange, etiqueta }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={etiqueta} style={{ '--n': opciones.length, '--i': Math.max(opciones.findIndex((o) => o.valor === valor), 0) }}>
      <span className="segmentado-fondo" aria-hidden="true" />
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} className={valor === o.valor ? 'activo' : ''} onClick={() => onChange(o.valor)}>
          {o.Icono && <o.Icono aria-hidden="true" />}
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export function Chips({ opciones, valor, onChange, etiqueta }) {
  return (
    <div className="chips" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} className={valor === o.valor ? 'activo' : ''} onClick={() => onChange(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export function SelectorColor({ valor, onChange }) {
  return (
    <div className="colores" role="radiogroup" aria-label="Color de la tarjeta">
      {Object.entries(COLORES).map(([k, c]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={valor === k}
          aria-label={c.nombre}
          className={valor === k ? 'activo' : ''}
          style={{ background: degradado(k), color: c.texto }}
          onClick={() => onChange(k)}
        >
          {valor === k && <LuCheck />}
        </button>
      ))}
    </div>
  )
}

/**
 * Formulario genérico.
 * campos: [{ nombre, etiqueta, tipo: 'texto'|'monto'|'numero'|'select'|'fecha'|'chips'|'color'|'segmento', opciones, requerido, ayuda, oculto }]
 */
export function Formulario({ campos, inicial, onGuardar, textoBoton = 'Guardar', onEliminar, onCambio, pie }) {
  const [valores, setValores] = useState(inicial)
  const [error, setError] = useState('')
  const id = useId()

  const set = (nombre, v) =>
    setValores((s) => {
      const nuevo = { ...s, [nombre]: v }
      onCambio?.(nuevo)
      return nuevo
    })

  const enviar = (e) => {
    e.preventDefault()
    const visibles = campos.filter((c) => !c.oculto?.(valores))
    const falta = visibles.find((c) => c.requerido && (valores[c.nombre] === '' || valores[c.nombre] === undefined || valores[c.nombre] === null))
    if (falta) return setError(`Completa: ${falta.etiqueta}`)
    const negativo = visibles.find((c) => ['monto', 'numero'].includes(c.tipo) && Number(valores[c.nombre]) < 0)
    if (negativo) return setError(`${negativo.etiqueta} no puede ser negativo`)
    setError('')
    const limpio = { ...valores }
    campos.forEach((c) => {
      if (['monto', 'numero'].includes(c.tipo)) limpio[c.nombre] = limpio[c.nombre] === '' || limpio[c.nombre] === undefined ? (c.vacio ?? 0) : Number(limpio[c.nombre])
    })
    onGuardar(limpio)
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {campos.map((c, i) => {
        if (c.oculto?.(valores)) return null
        const cid = `${id}-${c.nombre}-${i}`
        const v = valores[c.nombre]
        let control
        if (c.tipo === 'select')
          control = (
            <select id={cid} value={v ?? ''} onChange={(e) => set(c.nombre, e.target.value)}>
              {c.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          )
        else if (c.tipo === 'monto') control = <CampoMonto id={cid} value={v} onChange={(n) => set(c.nombre, n)} grande={c.grande} />
        else if (c.tipo === 'chips') control = <Chips etiqueta={c.etiqueta} opciones={c.opciones} valor={v} onChange={(x) => set(c.nombre, x)} />
        else if (c.tipo === 'segmento') control = <Segmentado etiqueta={c.etiqueta} opciones={c.opciones} valor={v} onChange={(x) => set(c.nombre, x)} />
        else if (c.tipo === 'color') control = <SelectorColor valor={v} onChange={(x) => set(c.nombre, x)} />
        else
          control = (
            <input
              id={cid}
              type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
              inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
              step={c.paso ?? (c.tipo === 'numero' ? 'any' : undefined)}
              min={c.min}
              max={c.max}
              maxLength={c.maxLength}
              placeholder={c.placeholder}
              value={v ?? ''}
              onChange={(e) => set(c.nombre, c.tipo === 'numero' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
            />
          )
        const agrupado = ['chips', 'segmento', 'color'].includes(c.tipo)
        return (
          <div key={`${c.nombre}-${i}`} className="campo">
            {agrupado ? <span className="campo-etiqueta">{c.etiqueta}</span> : <label htmlFor={cid} className="campo-etiqueta">{c.etiqueta}</label>}
            {control}
            {c.ayuda && <small>{typeof c.ayuda === 'function' ? c.ayuda(valores) : c.ayuda}</small>}
          </div>
        )
      })}
      {pie?.(valores)}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-acciones">
        {onEliminar && (
          <button type="button" className="btn btn-peligro" aria-label="Eliminar" onClick={() => confirm('¿Eliminar este registro?') && onEliminar()}>
            <LuTrash2 />
          </button>
        )}
        <button type="submit" className="btn btn-primario">{textoBoton}</button>
      </div>
    </form>
  )
}

// ---------- Bloques de presentación ----------
export function Tarjeta({ titulo, Icono, accion, children, className = '', style }) {
  return (
    <section className={`tarjeta ${className}`} style={style}>
      {(titulo || accion) && (
        <div className="tarjeta-cabecera">
          {titulo && (
            <h3>
              {Icono && <Icono aria-hidden="true" />}
              {titulo}
            </h3>
          )}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

export function Vacio({ Icono, titulo, texto, children }) {
  return (
    <div className="vacio">
      {Icono && <span className="vacio-icono"><Icono /></span>}
      {titulo && <h3>{titulo}</h3>}
      <p>{texto}</p>
      {children}
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

/** Número que se anima al cambiar (respeta "reducir movimiento"). */
export function NumeroAnimado({ valor, formato, duracion = 700 }) {
  const [mostrado, setMostrado] = useState(reducido() ? valor : 0)
  const desde = useRef(reducido() ? valor : 0)
  useEffect(() => {
    if (reducido()) return setMostrado(valor)
    const inicio = performance.now()
    const a = desde.current
    let raf
    const paso = (t) => {
      const p = Math.min((t - inicio) / duracion, 1)
      const e = 1 - Math.pow(1 - p, 3)
      const v = a + (valor - a) * e
      setMostrado(v)
      desde.current = v
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [valor])
  return <>{formato(mostrado)}</>
}

// ---------- Avisos (toast) ----------
/** avisar('texto') o avisar('texto', { texto: 'Deshacer', onClick }) para mostrar un botón de acción. */
export const avisar = (texto, accion) => window.dispatchEvent(new CustomEvent('aviso', { detail: { texto, accion } }))

export function Avisos() {
  const [lista, setLista] = useState([])
  useEffect(() => {
    const f = (e) => {
      const id = Math.random()
      const duracion = e.detail.accion ? 6000 : 2600
      setLista((l) => [...l, { id, ...e.detail, duracion }])
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), duracion)
    }
    window.addEventListener('aviso', f)
    return () => window.removeEventListener('aviso', f)
  }, [])
  return (
    <div className="avisos" role="status" aria-live="polite">
      {lista.map((a) => (
        <div key={a.id} className="aviso" style={{ animationDuration: `${a.duracion}ms` }}>
          <LuCheck aria-hidden="true" /> <span>{a.texto}</span>
          {a.accion && (
            <button
              className="aviso-accion"
              onClick={() => {
                a.accion.onClick()
                setLista((l) => l.filter((x) => x.id !== a.id))
              }}
            >
              {a.accion.texto}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
