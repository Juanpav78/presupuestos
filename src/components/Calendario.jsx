import { useState } from 'react'
import { LuCheck, LuCreditCard, LuRepeat, LuReceipt, LuScissors } from 'react-icons/lu'
import { diasDelMes, formatFecha, hoyISO } from '../lib/format'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const ICONOS = { deuda: LuCreditCard, fijo: LuRepeat, gasto: LuReceipt, corte: LuScissors }
const TEXTO = { deuda: 'Pago de tarjeta/crédito', fijo: 'Gasto fijo', gasto: 'Gasto', corte: 'Fecha de corte: lo que compres después va al siguiente extracto' }

/** eventos: [{ fecha, tipo: 'deuda'|'fijo'|'gasto', nombre, monto, pagado }] */
export default function Calendario({ mes, eventos, fmt, onElegir }) {
  const hoy = hoyISO()
  const [y, m] = mes.split('-').map(Number)
  const primerDia = (new Date(y, m - 1, 1).getDay() + 6) % 7 // lunes = 0
  const total = diasDelMes(mes)
  const porDia = {}
  eventos.forEach((e) => (porDia[e.fecha] = porDia[e.fecha] || []).push(e))
  const inicial = hoy.startsWith(mes) ? hoy : Object.keys(porDia).sort()[0] ?? `${mes}-01`
  const [sel, setSel] = useState(inicial)
  const seleccion = sel.startsWith(mes) ? sel : inicial
  const delDia = porDia[seleccion] ?? []

  return (
    <div className="calendario">
      <div className="cal-grid" role="grid" aria-label="Calendario de pagos">
        {DIAS.map((d) => <span key={d} className="cal-dia-semana" aria-hidden="true">{d}</span>)}
        {Array.from({ length: primerDia }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: total }, (_, i) => {
          const fecha = `${mes}-${String(i + 1).padStart(2, '0')}`
          const ev = porDia[fecha] ?? []
          const pendientes = ev.filter((e) => ['deuda', 'fijo'].includes(e.tipo) && !e.pagado)
          const vencido = fecha < hoy && pendientes.length > 0
          const clases = ['cal-dia', fecha === hoy && 'hoy', fecha === seleccion && 'sel', vencido && 'vencido', pendientes.length && 'con-pago'].filter(Boolean).join(' ')
          return (
            <button
              key={fecha}
              className={clases}
              onClick={() => setSel(fecha)}
              aria-label={`${i + 1}${ev.length ? `, ${ev.length} movimiento(s)` : ''}`}
              aria-pressed={fecha === seleccion}
            >
              {i + 1}
              {ev.length > 0 && (
                <span className="cal-puntos" aria-hidden="true">
                  {['deuda', 'corte', 'fijo', 'gasto'].filter((t) => ev.some((e) => e.tipo === t)).map((t) => <i key={t} className={`p-${t}`} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="cal-leyenda" aria-hidden="true">
        <span><i className="p-deuda" /> Tarjetas</span>
        <span><i className="p-corte" /> Corte</span>
        <span><i className="p-fijo" /> Fijos</span>
        <span><i className="p-gasto" /> Gastos</span>
      </div>
      <div className="cal-detalle" key={seleccion}>
        <h4>{formatFecha(seleccion, true)}</h4>
        {delDia.length === 0 ? (
          <p className="nota">Nada este día.</p>
        ) : (
          <ul className="lista compacta">
            {delDia.map((e, i) => {
              const Icono = ICONOS[e.tipo]
              return (
                <li key={i} onClick={() => onElegir?.(e)} className={e.pagado ? 'pagado' : ''}>
                  <span className={`icono-mini p-${e.tipo}`}><Icono aria-hidden="true" /></span>
                  <div className="lista-texto">
                    <strong>{e.nombre}</strong>
                    <small>{TEXTO[e.tipo]}{e.pagado && ' · pagado'}</small>
                  </div>
                  {e.tipo !== 'corte' && <span className="monto">{fmt.dinero(e.monto)}</span>}
                  {e.pagado && <LuCheck className="texto-verde" aria-label="Pagado" />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
