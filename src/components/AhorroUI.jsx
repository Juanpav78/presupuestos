import { useState } from 'react'
import { CampoMonto, SelectorColor, Segmentado } from './UI'
import { ICONOS_META } from '../views/Ahorro'
import { hoyISO, mesActual, nombreMes, sumarMeses } from '../lib/format'
import { ahorradoMeta } from '../lib/ahorro'

export function FormMeta({ inicial, fmt, onGuardar, onEliminar }) {
  const hoy = mesActual()
  const [v, setV] = useState({ nombre: '', objetivo: '', icono: 'viaje', color: 'turquesa', fechaMeta: sumarMeses(hoy, 6), ...inicial })
  const [error, setError] = useState('')
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }))
  const ahorrado = inicial?.aportes ? ahorradoMeta(inicial) : 0
  const meses = v.fechaMeta ? Math.max((Number(v.fechaMeta.slice(0, 4)) - Number(hoy.slice(0, 4))) * 12 + Number(v.fechaMeta.slice(5)) - Number(hoy.slice(5)) + 1, 1) : null
  const mensual = meses && v.objetivo > 0 ? Math.ceil(Math.max(v.objetivo - ahorrado, 0) / meses) : null

  const enviar = (e) => {
    e.preventDefault()
    if (!v.nombre.trim()) return setError('Ponle un nombre a tu meta')
    if (!(v.objetivo > 0)) return setError('¿Cuánto quieres ahorrar?')
    onGuardar({ ...v, nombre: v.nombre.trim(), objetivo: Number(v.objetivo) })
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <div className="campo">
        <span className="campo-etiqueta">¿Para qué?</span>
        <div className="categorias" role="radiogroup" aria-label="Tipo de meta">
          {Object.entries(ICONOS_META).map(([k, m]) => (
            <button key={k} type="button" role="radio" aria-checked={v.icono === k} className={v.icono === k ? 'activo' : ''}
              onClick={() => setV((s) => ({ ...s, icono: k, color: m.color, nombre: !s.nombre || Object.values(ICONOS_META).some((x) => x.texto === s.nombre) || s.nombre === 'Fondo de emergencia' ? (k === 'emergencia' ? 'Fondo de emergencia' : m.texto) : s.nombre }))}>
              <span className="icono-cat" style={{ '--c': 'var(--acento-texto)', width: 36, height: 36 }}><m.Icono /></span>
              <span>{m.texto}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="meta-nombre">Nombre</label>
        <input id="meta-nombre" value={v.nombre} placeholder="Ej: Viaje a San Andrés" onChange={(e) => set('nombre', e.target.value)} />
      </div>
      <div className="campo">
        <span className="campo-etiqueta">¿Cuánto necesitas?</span>
        <CampoMonto grande value={v.objetivo} onChange={(n) => set('objetivo', n)} aria-label="Monto objetivo" />
      </div>
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="meta-fecha">¿Para cuándo?</label>
        <select id="meta-fecha" value={v.fechaMeta ?? ''} onChange={(e) => set('fechaMeta', e.target.value || null)}>
          <option value="">Sin fecha límite</option>
          {Array.from({ length: 60 }, (_, i) => sumarMeses(hoy, i)).map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
        </select>
      </div>
      {mensual !== null && (
        <div className="meta-sugerido aparecer">
          <span>Para lograrlo ahorra al mes</span>
          <strong>{fmt.dinero(mensual)}</strong>
          <small>durante {meses} mes{meses > 1 ? 'es' : ''}{ahorrado > 0 ? ` (ya llevas ${fmt.dinero(ahorrado)})` : ''}</small>
        </div>
      )}
      <div className="campo">
        <span className="campo-etiqueta">Color</span>
        <SelectorColor valor={v.color} onChange={(c) => set('color', c)} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-acciones">
        {onEliminar && <button type="button" className="btn btn-peligro" onClick={() => confirm('¿Eliminar esta meta y sus movimientos?') && onEliminar()}>Eliminar</button>}
        <button type="submit" className="btn btn-primario">{inicial?.id ? 'Guardar cambios' : 'Crear meta'}</button>
      </div>
    </form>
  )
}

export function FormAporte({ meta, retiro: retiroInicial, inicial, fmt, onGuardar, onEliminar }) {
  const ahorrado = ahorradoMeta(meta)
  const [tipo, setTipo] = useState(inicial ? (inicial.monto < 0 ? 'retiro' : 'aporte') : retiroInicial ? 'retiro' : 'aporte')
  const [monto, setMonto] = useState(inicial ? Math.abs(inicial.monto) : '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const falta = Math.max((Number(meta.objetivo) || 0) - ahorrado, 0)
  const max = tipo === 'retiro' ? ahorrado + (inicial && inicial.monto < 0 ? Math.abs(inicial.monto) : 0) : null
  const invalido = !(monto > 0) || (max !== null && monto > max)
  return (
    <div className="formulario">
      <Segmentado etiqueta="Tipo de movimiento" valor={tipo} onChange={setTipo} opciones={[{ valor: 'aporte', texto: 'Ahorrar' }, { valor: 'retiro', texto: 'Retirar' }]} />
      <CampoMonto grande value={monto} onChange={setMonto} aria-label="Monto" />
      {tipo === 'aporte' && falta > 0 && (
        <div className="chips">
          <button type="button" onClick={() => setMonto(falta)}>Completar meta ({fmt.corto(falta)})</button>
        </div>
      )}
      {tipo === 'retiro' && <p className="nota">Tienes {fmt.dinero(ahorrado)} en esta meta.</p>}
      {max !== null && monto > max && <p className="error">No puedes retirar más de lo que tienes ahorrado.</p>}
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="ap-fecha">Fecha</label>
        <input id="ap-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="form-acciones">
        {onEliminar && <button type="button" className="btn btn-peligro" onClick={() => confirm('¿Eliminar este movimiento?') && onEliminar()}>Eliminar</button>}
        <button className="btn btn-primario" disabled={invalido} onClick={() => onGuardar({ ...(inicial ?? {}), monto: tipo === 'retiro' ? -Number(monto) : Number(monto), fecha })}>
          {tipo === 'retiro' ? 'Registrar retiro' : `Ahorrar ${fmt.dinero(monto || 0)}`}
        </button>
      </div>
    </div>
  )
}
