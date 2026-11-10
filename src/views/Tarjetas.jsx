import { useState } from 'react'
import {
  LuPlus, LuFileSpreadsheet, LuArrowLeft, LuWallet, LuShoppingBag, LuPencil, LuUndo2, LuCreditCard,
  LuTriangleAlert, LuHistory, LuTarget,
} from 'react-icons/lu'
import { formatFecha, mesActual, pct } from '../lib/format'
import { cobroDelMes, cobroCompra, interesesDeuda, ordenarCompras, saldoDeuda, simularPlan, tasaEA, tasaMensual } from '../lib/deudas'
import { resumenMes } from '../lib/resumen'
import { Tarjeta, Vacio, Dato, NumeroAnimado } from '../components/UI'
import { Progreso } from '../components/Graficas'
import TarjetaVisual from '../components/TarjetaVisual'

export default function Tarjetas(props) {
  const [abierta, setAbierta] = useState(null)
  const deuda = props.datos.deudas.find((d) => d.id === abierta)
  return (
    <div className="vista" key={deuda ? deuda.id : 'lista'}>
      {deuda ? <Detalle {...props} deuda={deuda} volver={() => setAbierta(null)} /> : <Lista {...props} abrirDeuda={setAbierta} />}
    </div>
  )
}

function Lista({ datos, fmt, abrir, ir, abrirDeuda }) {
  const mes = mesActual()
  const r = resumenMes(datos, mes)
  const deudas = [...datos.deudas].sort((a, b) => saldoDeuda(b) - saldoDeuda(a))
  const pagoMes = datos.deudas.reduce((t, d) => t + cobroDelMes(d, mes).total, 0)

  if (!deudas.length) {
    return (
      <Vacio Icono={LuCreditCard} titulo="Agrega tus tarjetas y créditos" texto="Calculamos intereses, lo que debes pagar cada mes y cómo salir de deudas más rápido.">
        <button className="btn btn-primario" onClick={() => abrir('deuda-nueva')}><LuPlus aria-hidden="true" /> Agregar tarjeta o crédito</button>
        <button className="btn btn-secundario" onClick={() => abrir('importar')}><LuFileSpreadsheet aria-hidden="true" /> Subir desde Excel</button>
      </Vacio>
    )
  }

  return (
    <>
      <section className="resumen-deudas">
        <div className="rd-principal">
          <span>Deuda total</span>
          <strong><NumeroAnimado valor={r.deudaTotal} formato={fmt.dinero} /></strong>
        </div>
        <div className="datos-grid">
          <Dato etiqueta="Por pagar este mes" valor={fmt.dinero(pagoMes)} />
          <Dato etiqueta="Intereses al mes" valor={fmt.dinero(r.interesesMes)} tono="rojo" />
          {r.utilizacion > 0 && <Dato etiqueta="Uso del cupo" valor={pct(r.utilizacion)} tono={r.utilizacion > 0.3 ? 'rojo' : 'verde'} />}
          <Dato etiqueta="Intereses al año" valor={fmt.corto(r.interesesMes * 12)} tono="rojo" />
        </div>
        <button className="btn btn-primario ancho" onClick={() => ir('plan')}><LuTarget aria-hidden="true" /> Ver mi plan para salir de deudas</button>
      </section>

      <div className="botones">
        <button className="btn btn-secundario" onClick={() => abrir('deuda-nueva')}><LuPlus aria-hidden="true" /> Nueva</button>
        <button className="btn btn-secundario" onClick={() => abrir('importar')}><LuFileSpreadsheet aria-hidden="true" /> Subir Excel</button>
      </div>

      <div className="pila-tarjetas">
        {deudas.map((d, i) => (
          <div key={d.id} className="pila-item" style={{ animationDelay: `${i * 70}ms` }}>
            <TarjetaVisual deuda={d} fmt={fmt} onClick={() => abrirDeuda(d.id)} />
            {saldoDeuda(d) > 0 && cobroDelMes(d, mes).total > 0 && (
              <button className="btn btn-pagar" onClick={() => abrir('pago', { deudaId: d.id })}>
                <LuWallet aria-hidden="true" /> Pagar {fmt.dinero(cobroDelMes(d, mes).total)}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function Detalle({ datos, acciones, fmt, abrir, deuda, volver }) {
  const mes = mesActual()
  const saldo = saldoDeuda(deuda)
  const cobro = cobroDelMes(deuda, mes)
  const r = tasaMensual(deuda)
  const esTarjeta = deuda.tipo !== 'credito'
  const compras = ordenarCompras(deuda.compras)
  const activas = compras.filter((c) => c.saldo > 0)
  const pagadas = compras.filter((c) => c.saldo <= 0)
  const pagos = datos.pagos.filter((p) => p.deudaId === deuda.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || 0)
  const ultimoId = [...datos.pagos].filter((p) => p.deudaId === deuda.id).pop()?.id
  const solo = saldo > 0 ? simularPlan([deuda], 0, 'minimos') : null

  return (
    <>
      <button className="volver" onClick={volver}><LuArrowLeft aria-hidden="true" /> Todas las tarjetas</button>
      <TarjetaVisual deuda={deuda} fmt={fmt} />

      <div className="acciones-detalle">
        {saldo > 0 && <button className="btn btn-primario" onClick={() => abrir('pago', { deudaId: deuda.id })}><LuWallet aria-hidden="true" /> Pagar</button>}
        {esTarjeta && <button className="btn btn-secundario" onClick={() => abrir('compra', { deudaId: deuda.id })}><LuShoppingBag aria-hidden="true" /> Compra</button>}
        <button className="btn btn-secundario" onClick={() => abrir('deuda-editar', { deudaId: deuda.id })} aria-label="Editar"><LuPencil aria-hidden="true" /> Editar</button>
      </div>

      <Tarjeta>
        <div className="datos-grid">
          <Dato etiqueta="Pago de este mes" valor={fmt.dinero(cobro.total)} />
          <Dato etiqueta="Intereses del mes" valor={fmt.dinero(interesesDeuda(deuda))} tono="rojo" />
          <Dato etiqueta="Tasa" valor={`${pct(tasaEA(deuda), 1)} E.A.`} />
          <Dato etiqueta="Mensual" valor={`${pct(r, 2)} M.V.`} />
          {esTarjeta && deuda.cupo > 0 && <Dato etiqueta="Cupo disponible" valor={fmt.dinero(Math.max(deuda.cupo - saldo, 0))} tono="verde" />}
          {esTarjeta && deuda.cupo > 0 && <Dato etiqueta="Uso del cupo" valor={pct(saldo / deuda.cupo)} tono={saldo / deuda.cupo > 0.3 ? 'rojo' : ''} />}
        </div>
        {cobro.total > 0 && (
          <p className="nota">Este mes: {fmt.dinero(cobro.capital)} de cuotas + {fmt.dinero(cobro.interes)} de intereses. Vence el día {deuda.diaPago || '—'}.</p>
        )}
        {solo && !solo.atascada && (
          <p className="nota">Pagando solo lo del mes terminas en <b>{solo.meses} meses</b> y pagas <b className="texto-rojo">{fmt.dinero(solo.totalIntereses)}</b> en intereses.</p>
        )}
        {solo?.atascada && <p className="alerta"><LuTriangleAlert aria-hidden="true" /> Con los pagos actuales esta deuda no baja. Revisa las cuotas o abona a capital.</p>}
      </Tarjeta>

      <Tarjeta titulo={esTarjeta ? `Compras a cuotas (${activas.length})` : 'Detalle del crédito'} Icono={LuShoppingBag}
        accion={esTarjeta && <button className="btn-texto" onClick={() => abrir('compra', { deudaId: deuda.id })}><LuPlus aria-hidden="true" /> Agregar</button>}>
        {activas.length === 0 ? (
          <p className="nota">{saldo > 0 ? '' : 'No hay saldo pendiente. '}Agrega compras para que se calculen las cuotas e intereses.</p>
        ) : (
          <ul className="lista compras">
            {activas.map((c) => {
              const cc = cobroCompra(c, r, mes)
              const n = Number(c.cuotas) || 1
              const pag = Math.min(Number(c.cuotasPagadas) || 0, n)
              return (
                <li key={c.id} onClick={() => abrir('compra', { deudaId: deuda.id, compra: c })}>
                  <div className="compra-cuerpo">
                    <div className="compra-fila">
                      <strong>{c.nombre}</strong>
                      <span className="monto">{fmt.dinero(c.saldo)}</span>
                    </div>
                    <Progreso valor={pag} max={n} etiqueta={`Cuotas pagadas de ${c.nombre}`} />
                    <div className="compra-fila sub">
                      <small>{formatFecha(c.fecha, true)} · cuota {Math.min(pag + 1, n)} de {n}{n === 1 ? ' (sin interés)' : ''}</small>
                      <small>{cc.total > 0 ? `Este mes ${fmt.dinero(cc.total)}` : 'Mes pagado ✓'}</small>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {pagadas.length > 0 && <p className="nota">{pagadas.length} compra(s) ya pagada(s) por completo.</p>}
      </Tarjeta>

      {pagos.length > 0 && (
        <Tarjeta titulo="Pagos realizados" Icono={LuHistory}>
          <ul className="lista compacta">
            {pagos.slice(0, 12).map((p) => (
              <li key={p.id}>
                <div className="lista-texto">
                  <strong>{fmt.dinero(p.monto)}</strong>
                  <small>
                    {formatFecha(p.fecha, true)}
                    {p.reparto && ` · intereses ${fmt.corto(p.reparto.intereses)} · cuotas ${fmt.corto(p.reparto.cuotas)}${p.reparto.abono ? ` · abono ${fmt.corto(p.reparto.abono)}` : ''}`}
                  </small>
                </div>
                {p.id === ultimoId && (
                  <button className="btn-icono" aria-label="Deshacer este pago" onClick={() => confirm('¿Deshacer este pago? Las compras vuelven a como estaban.') && acciones.deshacerPago(p.id)}>
                    <LuUndo2 />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  )
}
