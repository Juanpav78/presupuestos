import { useState } from 'react'
import { LuHandCoins, LuCalendarArrowUp, LuCheck, LuBriefcase, LuGift, LuUndo2 } from 'react-icons/lu'
import { Formulario, CampoMonto, Chips, avisar } from './UI'
import { aISO, formatFecha, hoyISO, mesActual, mesDe, nombreMes } from '../lib/format'

const sumarDias = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return aISO(new Date(y, m - 1, d + n))
}
const sumarUnMes = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  const ultimo = new Date(y, m + 1, 0).getDate()
  return aISO(new Date(y, m, Math.min(d, ultimo)))
}

export const textoCuando = (fecha) => {
  const hoy = hoyISO()
  const dias = Math.round((new Date(fecha) - new Date(hoy)) / 864e5)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'
  if (dias < 0) return `desde el ${formatFecha(fecha)}`
  if (dias < 7) return `en ${dias} días`
  return `el ${formatFecha(fecha)}`
}

/** Lista de ingresos por reclamar con botones "Lo recibí" y "Posponer". */
export function PorReclamar({ items, fmt, abrir, compacta }) {
  if (!items.length) return null
  const total = items.reduce((t, i) => t + i.monto, 0)
  return (
    <section className="tarjeta reclamar">
      <div className="tarjeta-cabecera">
        <h3><LuHandCoins aria-hidden="true" /> Dinero por reclamar</h3>
        <b className="monto">{fmt.dinero(total)}</b>
      </div>
      {!compacta && <p className="nota">Ya llegó la fecha. Confírmalo cuando lo tengas; mientras tanto no lo contamos como disponible.</p>}
      <ul className="lista reclamar-lista">
        {items.map((i, k) => (
          <li key={i.id} style={{ animationDelay: `${k * 60}ms` }}>
            <span className="icono-cat" style={{ '--c': i.tipo === 'fijo' ? '#16A34A' : '#EAB308' }}>{i.tipo === 'fijo' ? <LuBriefcase /> : <LuGift />}</span>
            <div className="lista-texto">
              <strong>{i.nombre}</strong>
              <small>{fmt.dinero(i.monto)} · {textoCuando(i.fecha)}{i.pospuesto ? ' · pospuesto' : ''}</small>
            </div>
            <div className="reclamar-botones">
              <button className="btn btn-mini btn-primario" onClick={() => abrir('reclamar', { item: i })}><LuCheck aria-hidden="true" /> Lo recibí</button>
              <button className="btn btn-mini btn-secundario" onClick={() => abrir('posponer', { item: i })} aria-label={`Posponer ${i.nombre}`}><LuCalendarArrowUp aria-hidden="true" /></button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FormReclamar({ item, fmt, onRecibir }) {
  const [monto, setMonto] = useState(item.monto)
  const [fecha, setFecha] = useState(hoyISO())
  return (
    <div className="formulario">
      <p className="nota">¿Cuánto te llegó? Si fue diferente a lo esperado, ajústalo.</p>
      <CampoMonto grande value={monto} onChange={setMonto} aria-label="Monto recibido" />
      {monto !== item.monto && monto > 0 && (
        <p className="nota aparecer">Esperabas {fmt.dinero(item.monto)} ({monto > item.monto ? '+' : '−'}{fmt.dinero(Math.abs(monto - item.monto))}).</p>
      )}
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="rec-fecha">Fecha en que lo recibiste</label>
        <input id="rec-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <button className="btn btn-primario" disabled={!(monto > 0)} onClick={() => onRecibir({ monto, fecha })}>
        <LuCheck aria-hidden="true" /> Confirmar {fmt.dinero(monto || 0)}
      </button>
    </div>
  )
}

export function FormPosponer({ item, onPosponer }) {
  const base = item.fecha > hoyISO() ? item.fecha : hoyISO()
  const opciones = [
    { valor: sumarDias(hoyISO(), 1), texto: 'Mañana' },
    { valor: sumarDias(base, 7), texto: '+1 semana' },
    { valor: sumarDias(base, 15), texto: '+15 días' },
    { valor: sumarUnMes(base), texto: '+1 mes' },
  ]
  const [fecha, setFecha] = useState(opciones[1].valor)
  const cambiaMes = mesDe(fecha) !== mesDe(item.fechaOriginal ?? item.fecha)
  return (
    <div className="formulario">
      <p className="nota">Esperabas <b>{item.nombre}</b> {textoCuando(item.fecha)}. ¿Para cuándo lo esperas ahora?</p>
      <Chips etiqueta="Nueva fecha" valor={fecha} onChange={setFecha} opciones={opciones} />
      <div className="campo">
        <label className="campo-etiqueta" htmlFor="pos-fecha">Otra fecha</label>
        <input id="pos-fecha" type="date" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      {cambiaMes && <p className="nota-corte aparecer">Pasa a {nombreMes(mesDe(fecha))}: dejará de contar en el mes original.</p>}
      <button className="btn btn-primario" onClick={() => onPosponer(fecha)}>
        <LuCalendarArrowUp aria-hidden="true" /> Posponer al {formatFecha(fecha, true)}
      </button>
    </div>
  )
}

export function FormFuente({ inicial, onGuardar, onEliminar }) {
  return (
    <Formulario
      inicial={inicial ?? { nombre: 'Salario', monto: '', frecuencia: 'mensual', dia: 30, dia2: 30 }}
      campos={[
        { nombre: 'monto', etiqueta: 'Monto de cada pago', tipo: 'monto', grande: true, requerido: true },
        { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, placeholder: 'Ej: Salario, Arriendo que recibo, Pensión' },
        { nombre: 'frecuencia', etiqueta: '¿Cada cuánto te pagan?', tipo: 'segmento', opciones: [{ valor: 'mensual', texto: 'Mensual' }, { valor: 'quincenal', texto: 'Quincenal' }] },
        { nombre: 'dia', etiqueta: 'Día de pago', tipo: 'numero', min: 1, max: 31, paso: 1, ayuda: (v) => (v.frecuencia === 'quincenal' ? 'Primera quincena (ej: 15)' : 'Si cae fin de semana, igual puedes posponerlo.') },
        { nombre: 'dia2', etiqueta: 'Día de la segunda quincena', tipo: 'numero', min: 1, max: 31, paso: 1, oculto: (v) => v.frecuencia !== 'quincenal', ayuda: 'Ej: 30 (si el mes es más corto, se usa el último día)' },
      ]}
      pie={(v) => v.monto > 0 && v.frecuencia === 'quincenal' ? <p className="nota">Al mes: {new Intl.NumberFormat('es-CO').format(v.monto * 2)}</p> : null}
      onGuardar={(f) => {
        let dia = Math.min(Math.max(Math.round(f.dia) || 30, 1), 31)
        let dia2 = Math.min(Math.max(Math.round(f.dia2) || 30, 1), 31)
        if (f.frecuencia === 'quincenal' && dia === dia2) { dia = 15; dia2 = 30 } // quincenas por defecto: 15 y 30
        if (f.frecuencia === 'quincenal' && dia > dia2) [dia, dia2] = [dia2, dia]
        onGuardar({ ...f, dia, dia2 })
      }}
      onEliminar={onEliminar}
      textoBoton={inicial ? 'Guardar cambios' : 'Agregar ingreso fijo'}
    />
  )
}

export function FormIngresoUnico({ mes, inicial, onGuardar, onEliminar }) {
  const hoy = hoyISO()
  const fechaBase = mes === mesActual() ? hoy : `${mes}-01`
  return (
    <Formulario
      inicial={inicial ? { ...inicial, estado: inicial.estado ?? 'recibido' } : { nombre: '', monto: '', fecha: fechaBase, estado: 'recibido' }}
      campos={[
        { nombre: 'monto', etiqueta: 'Monto', tipo: 'monto', grande: true, requerido: true },
        { nombre: 'nombre', etiqueta: 'Concepto', tipo: 'texto', requerido: true, placeholder: 'Ej: Prima, freelance, venta, me deben' },
        { nombre: 'estado', etiqueta: '¿Ya lo tienes?', tipo: 'segmento', opciones: [{ valor: 'recibido', texto: 'Ya lo recibí' }, { valor: 'esperado', texto: 'Lo voy a recibir' }] },
        { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, ayuda: (v) => (v.estado === 'esperado' ? 'Ese día te preguntaremos si llegó. No se cuenta como disponible hasta que lo confirmes.' : '') },
      ]}
      onGuardar={onGuardar}
      onEliminar={onEliminar}
      textoBoton={inicial?.id ? 'Guardar cambios' : 'Guardar ingreso'}
    />
  )
}

export function AccionesRecibido({ item, fmt, onDeshacer }) {
  return (
    <div className="formulario">
      <p className="nota">Recibiste <b>{fmt.dinero(item.monto)}</b> el {formatFecha(item.fecha, true)}.</p>
      <button className="btn btn-secundario" onClick={onDeshacer}><LuUndo2 aria-hidden="true" /> Marcar como no recibido</button>
    </div>
  )
}

export { avisar }
