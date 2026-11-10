import { useState } from 'react'
import {
  LuTriangleAlert, LuCalendarDays, LuChartPie, LuChartColumn, LuScale, LuCreditCard, LuRepeat, LuCheck,
  LuSparkles, LuArrowRight, LuWallet, LuBellRing, LuMoon, LuX,
} from 'react-icons/lu'
import { mesActual, soloMes, nombreMes, pct, formatFecha, hoyISO, color, fechaEnMes } from '../lib/format'
import { historico, resumenMes, vencimientos } from '../lib/resumen'
import { saldoDeuda, cobroDelMes, interesesDeuda } from '../lib/deudas'
import { infoCategoria, IconoCategoria } from '../lib/categorias'
import { Tarjeta, Dato, NumeroAnimado } from '../components/UI'
import { Barras, Dona, Leyenda, Progreso } from '../components/Graficas'
import Calendario from '../components/Calendario'
import { PorReclamar } from '../components/IngresosUI'
import { porReclamar, ingresosDelMes } from '../lib/ingresos'

export default function Inicio({ datos, acciones, mes, fmt, ir, abrir }) {
  const r = resumenMes(datos, mes)
  const esMesActual = mes === mesActual()
  const hoy = hoyISO()
  const venc = vencimientos(datos, mes)
  const pendientes = venc.filter((v) => !v.pagado)
  const sinConfigurar = !(datos.fuentes ?? []).length && !datos.gastos.length && !datos.deudas.length && !datos.fijos.length
  const reclamar = esMesActual ? porReclamar(datos) : []
  // Recordatorio nocturno dentro de la app: después de las 8 p. m. si no registraste nada hoy
  const horaNoche = Number((datos.config.horaRecordatorio || '20:00').split(':')[0])
  const [ocultarNoche, setOcultarNoche] = useState(() => { try { return localStorage.getItem('noche') === hoy } catch { return false } })
  const registroHoy = datos.gastos.some((g) => g.fecha === hoy || (g.creado && new Date(g.creado).toISOString().slice(0, 10) === hoy))
  const mostrarNoche = esMesActual && !sinConfigurar && !ocultarNoche && new Date().getHours() >= horaNoche && !registroHoy

  const destino = [
    { nombre: 'Gastos fijos', valor: r.fijosTotal, color: '#8B5CF6' },
    { nombre: 'Tarjetas y créditos', valor: r.pagoDeudas, color: '#EF4444' },
    { nombre: 'Gastos del mes', valor: r.gastadoEfectivo, color: '#F97316' },
    { nombre: 'Libre', valor: Math.max(r.libre, 0), color: '#FACC15' },
  ].filter((d) => d.valor > 0)

  const categorias = Object.entries(r.porCategoria)
    .map(([nombre, valor]) => ({ nombre, valor, color: infoCategoria(nombre).color }))
    .sort((a, b) => b.valor - a.valor)
  const totalCat = categorias.reduce((t, c) => t + c.valor, 0)
  const hist = historico(datos, mes, 6)

  // Alertas
  const alertas = []
  if (r.libre < 0 && r.ingreso > 0) alertas.push(`Tus gastos y pagos superan tu ingreso por ${fmt.dinero(-r.libre)} este mes.`)
  if (r.presupuestoVariable && r.gastado > r.presupuestoVariable) alertas.push(`Te pasaste ${fmt.dinero(r.gastado - r.presupuestoVariable)} del presupuesto de gastos.`)
  if (r.utilizacion > 0.3) alertas.push(`Usas el ${pct(r.utilizacion)} del cupo de tus tarjetas. Lo sano es menos del 30%.`)
  datos.deudas.forEach((d) => {
    const c = cobroDelMes(d, mes)
    if (saldoDeuda(d) > 0 && c.total > 0 && c.capital <= 1 && interesesDeuda(d) > 0) alertas.push(`El pago de "${d.nombre}" solo cubre intereses: la deuda no baja.`)
  })
  if (r.ingreso && r.minimos / r.ingreso > 0.4) alertas.push(`Tus cuotas son el ${pct(r.minimos / r.ingreso)} de tu ingreso (lo sano es menos del 40%).`)
  if (esMesActual) pendientes.filter((p) => p.fecha < hoy && !p.sinDia).forEach((p) => alertas.push(`${p.nombre} está vencido desde el ${formatFecha(p.fecha)}.`))

  const eventos = [
    ...venc.map((v) => ({ ...v, tipo: v.tipo })),
    ...r.gastosMes.map((g) => ({ tipo: 'gasto', fecha: g.fecha, nombre: g.nombre, monto: g.monto, id: g.id })),
    ...ingresosDelMes(datos, mes).map((i) => ({ ...i, tipo: 'ingreso', pagado: i.recibido, ingreso: i })),
    ...datos.deudas.filter((d) => d.diaCorte && d.tipo !== 'credito').map((d) => ({ tipo: 'corte', id: d.id, fecha: fechaEnMes(mes, d.diaCorte), nombre: `Corte ${d.nombre}`, monto: 0 })),
  ]

  const tocarVencimiento = (v) => {
    if (v.tipo === 'deuda') abrir('pago', { deudaId: v.id })
    else if (v.tipo === 'fijo') acciones.togglePagoFijo(mes, v.id)
    else if (v.tipo === 'corte') ir('tarjetas')
    else if (v.tipo === 'ingreso') abrir(v.ingreso.recibido ? 'recibido' : v.ingreso.fecha <= hoy ? 'reclamar' : 'posponer', { item: v.ingreso })
    else abrir('gasto', { gasto: datos.gastos.find((g) => g.id === v.id) })
  }

  return (
    <>
      {sinConfigurar && (
        <section className="tarjeta bienvenida">
          <span className="bienvenida-icono"><LuSparkles /></span>
          <h2>Bienvenido a tus finanzas</h2>
          <p>Configúralo en 2 minutos:</p>
          <div className="pasos-inicio">
            <button onClick={() => abrir('fuente')}><span>1</span>Tu salario o ingreso fijo<LuArrowRight /></button>
            <button onClick={() => abrir('deuda-nueva')}><span>2</span>Tarjetas y créditos<LuArrowRight /></button>
            <button onClick={() => abrir('fijo')}><span>3</span>Gastos fijos<LuArrowRight /></button>
            <button onClick={() => abrir('importar')}><span>⚡</span>O súbelo todo desde Excel<LuArrowRight /></button>
          </div>
        </section>
      )}

      {mostrarNoche && (
        <section className="tarjeta recordatorio-noche aparecer">
          <LuMoon aria-hidden="true" />
          <div>
            <strong>¿Ya registraste tus gastos de hoy?</strong>
            <small>Toma 1 minuto y mantiene tus cuentas al día.</small>
          </div>
          <button className="btn btn-mini btn-primario" onClick={() => abrir('gasto')}>Registrar</button>
          <button className="btn-icono" aria-label="Hoy no gasté" onClick={() => { try { localStorage.setItem('noche', hoy) } catch {} setOcultarNoche(true) }}><LuX /></button>
        </section>
      )}

      <PorReclamar items={reclamar} fmt={fmt} abrir={abrir} compacta />

      <section className="hero">
        <span className="hero-glow" aria-hidden="true" />
        <span className="hero-etiqueta">
          {r.futuro ? 'Proyección: te quedaría libre en ' : 'Te queda libre en '}{soloMes(mes).toLowerCase()}
        </span>
        <div className={`hero-monto ${r.libre < 0 ? 'negativo' : ''}`}>
          <NumeroAnimado valor={r.libre} formato={fmt.dinero} />
        </div>
        <div className="hero-datos">
          <Dato etiqueta="Ingresos" valor={fmt.corto(r.ingreso)} />
          <Dato etiqueta="Por pagar" valor={fmt.corto(r.compromisos)} />
          <Dato etiqueta="Gastado" valor={fmt.corto(r.gastado)} />
          <Dato etiqueta="Deuda total" valor={fmt.corto(r.deudaTotal)} />
        </div>
        {r.porRecibir > 0 && <span className="hero-sub">+ {fmt.dinero(r.porRecibir)} por recibir que aún no contamos.</span>}
      </section>

      {alertas.length > 0 && (
        <div className="alertas">
          {alertas.slice(0, 4).map((a, i) => (
            <p key={i} className="alerta" style={{ animationDelay: `${i * 60}ms` }}><LuTriangleAlert aria-hidden="true" /> {a}</p>
          ))}
        </div>
      )}

      <Tarjeta titulo={r.futuro ? `Por pagar en ${soloMes(mes).toLowerCase()}` : 'Por pagar este mes'} Icono={LuWallet}
        accion={venc.length > 0 && <button className="btn-icono" aria-label="Recordatorios en el calendario" onClick={() => abrir('recordatorios')}><LuBellRing /></button>}>
        {r.futuro && <p className="nota"><LuSparkles aria-hidden="true" /> Proyección suponiendo que pagas al día las cuotas de los meses anteriores.</p>}
        <div className="pagar-mes">
          <div><span>Total</span><strong>{fmt.dinero(r.compromisos)}</strong></div>
          <div><span>Pagado</span><strong className="texto-verde">{fmt.dinero(r.pagadoMes)}</strong></div>
          <div><span>Falta</span><strong>{fmt.dinero(Math.max(r.compromisos - r.pagadoMes, 0))}</strong></div>
        </div>
        <Progreso valor={r.pagadoMes} max={r.compromisos || 1} color="var(--verde)" etiqueta="Avance de pagos del mes" />
        {venc.length > 0 ? (
          <ul className="lista compacta">
            {venc.slice(0, 8).map((v) => {
              const vencido = esMesActual && !v.pagado && v.fecha < hoy && !v.sinDia
              const dias = Math.round((new Date(v.fecha) - new Date(hoy)) / 864e5)
              return (
                <li key={v.tipo + v.id} className={v.pagado ? 'pagado' : ''} onClick={() => tocarVencimiento(v)}>
                  <span className={`fecha-chip ${vencido ? 'vencido' : esMesActual && !v.pagado && dias <= 3 ? 'pronto' : ''}`}>
                    <b>{Number(v.fecha.slice(8))}</b>
                    <small>{soloMes(mes).slice(0, 3)}</small>
                  </span>
                  <div className="lista-texto">
                    <strong>
                      {v.tipo === 'deuda' && <span className="punto-color" style={{ background: color(v.color).a }} />}
                      {v.nombre}
                    </strong>
                    <small>
                      {v.tipo === 'deuda' ? <><LuCreditCard aria-hidden="true" /> Pago del mes</> : <><LuRepeat aria-hidden="true" /> Gasto fijo</>}
                      {v.sinDia && ' · sin día de pago'}{!v.pagado && esMesActual && !v.sinDia && (vencido ? ' · vencido' : dias === 0 ? ' · hoy' : ` · en ${dias} días`)}
                    </small>
                  </div>
                  <span className="monto">{fmt.dinero(v.monto)}</span>
                  {v.pagado ? <LuCheck className="check-ok" aria-label="Pagado" /> : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="nota">Agrega gastos fijos y tarjetas para ver aquí lo que debes pagar.</p>
        )}
        {r.pagoDeudas > r.minimos + 1 && (
          <p className="nota">Incluye {fmt.dinero(r.pagoDeudas - r.minimos)} extra para salir de deudas según tu <button className="btn-texto" onClick={() => ir('plan')}>plan</button>.</p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Calendario" Icono={LuCalendarDays}>
        <Calendario mes={mes} eventos={eventos} fmt={fmt} onElegir={tocarVencimiento} />
      </Tarjeta>

      {destino.length > 0 && r.ingreso > 0 && (
        <Tarjeta titulo="¿A dónde va tu ingreso?" Icono={LuChartPie}>
          <div className="dona-fila">
            <Dona datos={destino} centro={pct(Math.max(r.libre, 0) / r.ingreso)} subtitulo="libre" tamano={140} />
            <Leyenda items={destino.map((d) => ({ ...d, valor: pct(d.valor / r.ingreso) }))} />
          </div>
        </Tarjeta>
      )}

      {categorias.length > 0 && (
        <Tarjeta titulo="Gastos por categoría" Icono={LuChartColumn}>
          <ul className="barras-cat">
            {categorias.slice(0, 7).map((c, i) => (
              <li key={c.nombre} style={{ animationDelay: `${i * 50}ms` }}>
                <IconoCategoria categoria={c.nombre} tamano={34} />
                <div>
                  <div className="bc-fila"><span>{c.nombre}</span><b>{fmt.dinero(c.valor)}</b></div>
                  <Progreso valor={c.valor} max={categorias[0].valor} color={c.color} etiqueta={c.nombre} />
                </div>
                <small>{pct(c.valor / totalCat)}</small>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {r.ingreso > 0 && (
        <Tarjeta titulo="Regla 50 / 30 / 20" Icono={LuScale}>
          <p className="nota">Guía sana: 50% necesidades, 30% gustos, 20% ahorro y deudas.</p>
          {[
            ['Necesidades', r.tipoGasto.necesidad, 0.5, '#3B82F6'],
            ['Gustos', r.tipoGasto.deseo, 0.3, '#F97316'],
            ['Ahorro y deudas', r.tipoGasto.ahorro, 0.2, '#FACC15'],
          ].map(([n, v, meta, c]) => (
            <div key={n} className="regla">
              <div className="regla-fila">
                <span>{n}</span>
                <span><strong>{pct(v / r.ingreso)}</strong> <small>/ {pct(meta)}</small></span>
              </div>
              <Progreso valor={v} max={r.ingreso * meta} color={c} alerta={n === 'Ahorro y deudas' ? c : 'var(--rojo)'} etiqueta={n} />
            </div>
          ))}
        </Tarjeta>
      )}

      {hist.some((h) => h.variables || h.pagos) && (
        <Tarjeta titulo="Últimos 6 meses" Icono={LuChartColumn}>
          <Barras
            datos={hist.map((h) => ({ etiqueta: nombreMes(h.mes, true), valores: [{ valor: h.variables, color: '#F97316' }, { valor: h.pagos, color: '#FACC15' }] }))}
            formato={fmt.dinero}
          />
          <Leyenda items={[{ nombre: 'Gastos', color: '#F97316' }, { nombre: 'Pagos a tarjetas', color: '#FACC15' }]} />
        </Tarjeta>
      )}
    </>
  )
}
