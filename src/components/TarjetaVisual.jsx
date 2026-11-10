import { LuLandmark, LuNfc } from 'react-icons/lu'
import { color, degradado, mesActual } from '../lib/format'
import { cobroDelMes, saldoDeuda, tasaEA } from '../lib/deudas'

export default function TarjetaVisual({ deuda, fmt, onClick, mes = mesActual(), estilo }) {
  const c = color(deuda.color)
  const saldo = saldoDeuda(deuda)
  const cobro = cobroDelMes(deuda, mes)
  const esTarjeta = deuda.tipo !== 'credito'
  const uso = esTarjeta && deuda.cupo > 0 ? Math.min(saldo / deuda.cupo, 1) : null
  const Etiqueta = onClick ? 'button' : 'div'

  return (
    <Etiqueta
      className="tarjeta-visual"
      style={{ background: degradado(deuda.color), color: c.texto, ...estilo }}
      onClick={onClick}
      aria-label={onClick ? `${deuda.nombre}, debes ${fmt.dinero(saldo)}. Abrir detalle` : undefined}
    >
      <span className="tv-brillo" aria-hidden="true" />
      <div className="tv-fila">
        <span className="tv-nombre">{deuda.nombre}</span>
        {esTarjeta ? <LuNfc className="tv-logo" aria-hidden="true" /> : <LuLandmark className="tv-logo" aria-hidden="true" />}
      </div>
      <div className="tv-fila tv-medio">
        {esTarjeta ? <span className="tv-chip" aria-hidden="true" /> : <span className="tv-tipo">Crédito</span>}
        <span className="tv-numero">{deuda.ultimos4 ? `•••• ${deuda.ultimos4}` : `${(tasaEA(deuda) * 100).toFixed(1)}% E.A.`}</span>
      </div>
      <div className="tv-saldo">
        <small>{saldo > 0 ? 'Debes' : '¡Pagada!'}</small>
        <strong>{fmt.dinero(saldo)}</strong>
      </div>
      {uso !== null && (
        <div className="tv-uso" aria-hidden="true">
          <div style={{ '--p': uso }} />
        </div>
      )}
      <div className="tv-fila tv-pie">
        <span>
          {cobro.total > 0 ? <>Pago del mes <b>{fmt.dinero(cobro.total)}</b></> : saldo > 0 ? 'Mes al día ✓' : 'Sin saldo'}
        </span>
        <span>{deuda.diaPago ? `Vence día ${deuda.diaPago}` : ''}</span>
      </div>
    </Etiqueta>
  )
}
