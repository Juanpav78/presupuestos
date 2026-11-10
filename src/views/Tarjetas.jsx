import { useState } from 'react'
import {
  LuPlus, LuFileSpreadsheet, LuArrowLeft, LuWallet, LuShoppingBag, LuPencil, LuUndo2, LuCreditCard,
  LuTriangleAlert, LuHistory, LuTarget, LuChevronDown, LuCalendarRange, LuCircleCheck, LuCalculator,
} from 'react-icons/lu'
import { formatFecha, mesActual, mesDe, nombreMes, soloMes, pct } from '../lib/format'
import { cobroDelMes, cobroCompra, finCompras, interesesDeuda, ordenarCompras, proyectar, saldoDeuda, simularPlan, tasaEA, tasaMensual } from '../lib/deudas'
import { resumenMes } from '../lib/resumen'
import { Tarjeta, Vacio, Dato, NumeroAnimado, avisar, Segmentado } from '../components/UI'
import { Progreso, Barras, Leyenda } from '../components/Graficas'
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
        <button className="btn btn-secundario" onClick={() => abrir('importar')}><LuFileSpreadsheet aria-hidden="true" /> Excel</button>
        <button className="btn btn-secundario" onClick={() => abrir('alcanza')}><LuCalculator aria-hidden="true" /> ¿Me alcanza?</button>
      </div>

      <div className="pila-tarjetas">
        {deudas.map((d, i) => (
          <div key={d.id} className="pila-item" style={{ animationDelay: `${i * 70}ms` }}>
            <TarjetaVisual deuda={d} fmt={fmt} onClick={() => abrirDeuda(d.id)} />
            {saldoDeuda(d) > 0 && (
              <button className="btn btn-pagar" onClick={() => abrir('pago', { deudaId: d.id })}>
                <LuWallet aria-hidden="true" />
                {cobroDelMes(d, mes).total > 0 ? `Pagar ${fmt.dinero(cobroDelMes(d, mes).total)}` : 'Mes al día · abonar a capital'}
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
  const pagos = datos.pagos.filter((p) => p.deudaId === deuda.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || 0)
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

      <ListaCompras deuda={deuda} fmt={fmt} abrir={abrir} />

      {saldo > 0 && <ProximosMeses deuda={deuda} fmt={fmt} />}

      {pagos.length > 0 && (
        <Tarjeta titulo="Pagos realizados" Icono={LuHistory}>
          <p className="nota">Si registraste un pago por error, toca <LuUndo2 aria-label="revertir" /> para revertirlo.</p>
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
                <button
                  className="btn-icono"
                  aria-label={`Revertir pago de ${fmt.dinero(p.monto)}`}
                  onClick={() => {
                    if (confirm(`¿Revertir el pago de ${fmt.dinero(p.monto)} del ${formatFecha(p.fecha, true)}? El saldo vuelve a como estaba.`)) {
                      acciones.deshacerPago(p.id)
                      avisar('Pago revertido')
                    }
                  }}
                >
                  <LuUndo2 />
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  )
}

// ---------- Compras: agrupadas por mes, con distintivos ----------
const PALETA = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444', '#84CC16', '#14B8A6']
const colorDe = (txt) => PALETA[[...String(txt)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % PALETA.length]

function ListaCompras({ deuda, fmt, abrir }) {
  const mes = mesActual()
  const r = tasaMensual(deuda)
  const esTarjeta = deuda.tipo !== 'credito'
  const [orden, setOrden] = useState('fecha')
  const [verTerminadas, setVerTerminadas] = useState(false)
  const todas = ordenarCompras(deuda.compras)
  const activas = todas.filter((c) => c.saldo > 0.5)
  const terminadas = todas.filter((c) => c.saldo <= 0.5)
  const fin = finCompras(deuda, mes)

  const ordenadas = [...activas].sort((a, b) => {
    if (orden === 'termina') return (fin[a.id] ?? '9999').localeCompare(fin[b.id] ?? '9999') || b.saldo - a.saldo
    if (orden === 'saldo') return b.saldo - a.saldo
    return (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || 0) - (a.creado || 0)
  })
  // Agrupar por mes de compra (solo en orden por fecha)
  const grupos = orden === 'fecha'
    ? Object.entries(ordenadas.reduce((acc, c) => ((acc[mesDe(c.fecha)] = acc[mesDe(c.fecha)] || []).push(c), acc), {}))
    : [['', ordenadas]]

  const fila = (c) => {
    const cc = cobroCompra(c, r, mes)
    const n = Number(c.cuotas) || 1
    const pag = Math.min(Number(c.cuotasPagadas) || 0, n)
    const restantes = Math.max(n - pag, 0)
    const col = colorDe(c.nombre)
    const insignias = []
    if (mesDe(c.fecha) === mes) insignias.push(['Nueva', 'nueva'])
    if (n === 1) insignias.push(['Sin interés', 'verde'])
    else if (restantes === 1) insignias.push(['Última cuota', 'acento'])
    if (fin[c.id] && n > 1) insignias.push([`Termina ${nombreMes(fin[c.id], true)}`, ''])
    if (!fin[c.id]) insignias.push(['No baja', 'rojo'])
    return (
      <li key={c.id} className="compra" style={{ '--c': col }} onClick={() => abrir('compra', { deudaId: deuda.id, compra: c })}>
        <span className="compra-avatar" aria-hidden="true">{c.nombre.trim().charAt(0).toUpperCase() || '•'}</span>
        <div className="compra-cuerpo">
          <div className="compra-fila">
            <strong>{c.nombre}</strong>
            <span className="monto">{fmt.dinero(c.saldo)}</span>
          </div>
          <div className="compra-fila sub">
            <small>{formatFecha(c.fecha, true)} · {fmt.dinero(c.monto)}</small>
            <small>{cc.total > 0 ? <>Este mes <b>{fmt.dinero(cc.total)}</b></> : <span className="texto-verde">Mes pagado ✓</span>}</small>
          </div>
          <div className="cuotas-barra" aria-label={`${pag} de ${n} cuotas pagadas`}>
            {n <= 36
              ? Array.from({ length: n }, (_, i) => <i key={i} className={i < pag ? 'hecha' : i === pag ? 'actual' : ''} />)
              : <Progreso valor={pag} max={n} color={col} />}
          </div>
          <div className="compra-fila sub">
            <small><b>{pag}</b> de {n} cuotas{restantes > 0 && n > 1 ? ` · faltan ${restantes}` : ''}</small>
            <span className="insignias">
              {insignias.map(([t, k]) => <em key={t} className={k}>{t}</em>)}
            </span>
          </div>
        </div>
      </li>
    )
  }

  return (
    <Tarjeta
      titulo={esTarjeta ? `Compras activas (${activas.length})` : 'Detalle del crédito'}
      Icono={LuShoppingBag}
      accion={esTarjeta && <button className="btn-texto" onClick={() => abrir('compra', { deudaId: deuda.id })}><LuPlus aria-hidden="true" /> Agregar</button>}
    >
      {activas.length > 1 && (
        <Segmentado
          etiqueta="Ordenar compras"
          valor={orden}
          onChange={setOrden}
          opciones={[{ valor: 'fecha', texto: 'Por fecha' }, { valor: 'termina', texto: 'Terminan antes' }, { valor: 'saldo', texto: 'Mayor saldo' }]}
        />
      )}
      {activas.length === 0 ? (
        <p className="nota">{terminadas.length ? '¡No tienes compras pendientes en esta tarjeta! ' : ''}Agrega compras para calcular cuotas e intereses.</p>
      ) : (
        grupos.map(([m, lista]) => (
          <div key={m || 'todas'} className="grupo-compras">
            {m && (
              <h4 className="grupo-titulo">
                <span>{nombreMes(m)}</span>
                <small>{lista.length} compra{lista.length > 1 ? 's' : ''} · {fmt.dinero(lista.reduce((t, c) => t + c.saldo, 0))}</small>
              </h4>
            )}
            <ul className="lista compras">{lista.map(fila)}</ul>
          </div>
        ))
      )}
      {terminadas.length > 0 && (
        <>
          <button className="btn-texto ver-terminadas" onClick={() => setVerTerminadas(!verTerminadas)} aria-expanded={verTerminadas}>
            <LuCircleCheck aria-hidden="true" /> {terminadas.length} compra{terminadas.length > 1 ? 's' : ''} ya pagada{terminadas.length > 1 ? 's' : ''}
            <LuChevronDown aria-hidden="true" style={{ transform: verTerminadas ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
          </button>
          {verTerminadas && (
            <ul className="lista compacta terminadas aparecer">
              {terminadas.map((c) => (
                <li key={c.id} onClick={() => abrir('compra', { deudaId: deuda.id, compra: c })}>
                  <div className="lista-texto">
                    <strong>{c.nombre}</strong>
                    <small>{formatFecha(c.fecha, true)} · {c.cuotas} cuota{c.cuotas > 1 ? 's' : ''}</small>
                  </div>
                  <span className="monto">{fmt.dinero(c.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Tarjeta>
  )
}

// ---------- Próximos meses (suponiendo que pagas lo del mes) ----------
function ProximosMeses({ deuda, fmt }) {
  const mes = mesActual()
  const meses = proyectar(deuda, mes, 12)
  const ultimo = meses.findLastIndex((m) => m.total > 0)
  const visibles = meses.slice(0, Math.max(Math.min(ultimo + 1, 12), 1))
  return (
    <Tarjeta titulo="Próximos meses" Icono={LuCalendarRange}>
      <p className="nota">Si pagas lo de cada mes, así irán tus cuotas y tu saldo.</p>
      <Barras
        datos={visibles.slice(0, 6).map((m) => ({ etiqueta: nombreMes(m.mes, true), valores: [{ valor: m.capital, color: '#FACC15' }, { valor: m.interes, color: '#EF4444' }] }))}
        formato={fmt.dinero}
      />
      <Leyenda items={[{ nombre: 'Cuotas (capital)', color: '#FACC15' }, { nombre: 'Intereses', color: '#EF4444' }]} />
      <ul className="lista compacta proximos">
        {visibles.map((m, i) => (
          <li key={m.mes} style={{ animationDelay: `${i * 30}ms` }}>
            <span className="fecha-chip"><b>{soloMes(m.mes).slice(0, 3)}</b><small>{m.mes.slice(2, 4)}</small></span>
            <div className="lista-texto">
              <strong>{m.total > 0 ? fmt.dinero(m.total) : i === 0 ? 'Pagado ✓' : '—'}</strong>
              <small>
                Quedas debiendo {fmt.corto(m.saldo)}
                {m.terminan.length > 0 && <> · <span className="texto-verde">terminas {m.terminan.join(', ')}</span></>}
              </small>
            </div>
          </li>
        ))}
      </ul>
      {meses.at(-1).saldo > 0.5 && <p className="nota">Después de 12 meses aún quedarías debiendo {fmt.dinero(meses.at(-1).saldo)}.</p>}
    </Tarjeta>
  )
}
