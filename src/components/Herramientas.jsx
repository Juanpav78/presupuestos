import { useMemo, useState } from 'react'
import {
  LuGift, LuPlus, LuTrash2, LuThumbsUp, LuTriangleAlert, LuCircleX, LuCalendarPlus, LuExternalLink, LuDownload,
  LuHourglass, LuSparkles, LuCreditCard, LuRepeat,
} from 'react-icons/lu'
import { CampoMonto, Chips, Segmentado, Dato, avisar } from './UI'
import { mesActual, nombreMes, sumarMeses, hoyISO, generarId, soloMes } from '../lib/format'
import { cobroCompra, cobroDelMes, ordenarPorEstrategia, saldoDeuda, simularPlan, tasaMensual, mesPrimerCobro } from '../lib/deudas'
import { resumenMes } from '../lib/resumen'
import { crearICS, enlaceGoogle } from '../lib/recordatorios'
import { descargar } from '../lib/excel'

const textoMeses = (m) => {
  if (m < 12) return `${m} ${m === 1 ? 'mes' : 'meses'}`
  const a = Math.floor(m / 12)
  const r = m % 12
  return `${a} ${a === 1 ? 'año' : 'años'}${r ? ` y ${r} ${r === 1 ? 'mes' : 'meses'}` : ''}`
}

/** Convierte los abonos planeados en una función (númeroDeMes) => monto para simularPlan. */
export const extrasDesde = (abonos = [], hoy = mesActual()) => {
  if (!abonos.length) return null
  return (i) => {
    const mes = sumarMeses(hoy, i - 1)
    return abonos.reduce((t, a) => {
      const aplica = a.anual ? mes >= a.mes && mes.slice(5) === a.mes.slice(5) : mes === a.mes
      return t + (aplica ? Number(a.monto) || 0 : 0)
    }, 0)
  }
}

/** Datos base del plan que usan las herramientas. */
export const basePlan = (datos) => {
  const activas = datos.deudas.filter((d) => saldoDeuda(d) > 0.5)
  const minimos = activas.reduce((t, d) => t + cobroDelMes(d).total, 0)
  const pago = Math.max(Number(datos.config.pagoDeudasMensual) || 0, minimos)
  return { activas, minimos, pago, estrategia: datos.config.estrategia || 'avalancha' }
}

// =====================================================================
// 1. Simulador de abonos extra (primas, bonos…)
// =====================================================================
export function SimuladorAbonos({ datos, acciones, fmt }) {
  const hoy = mesActual()
  const { activas, pago, estrategia } = basePlan(datos)
  const planeados = datos.config.abonosPlaneados ?? []
  const [monto, setMonto] = useState('')
  const proximoMes = (mm) => (hoy.slice(5) <= mm ? `${hoy.slice(0, 4)}-${mm}` : `${Number(hoy.slice(0, 4)) + 1}-${mm}`)
  const [mes, setMes] = useState(proximoMes('12'))
  const [anual, setAnual] = useState(false)

  const base = useMemo(() => simularPlan(activas, pago, estrategia, 360, extrasDesde(planeados, hoy)), [datos.deudas, pago, estrategia, planeados])
  const prueba = monto > 0 ? [...planeados, { mes, monto, anual }] : null
  const con = useMemo(() => (prueba ? simularPlan(activas, pago, estrategia, 360, extrasDesde(prueba, hoy)) : null), [datos.deudas, pago, estrategia, planeados, monto, mes, anual])

  // ¿A qué deuda iría el abono? (la objetivo de la estrategia ese mes, aproximado con el orden actual)
  const destino = ordenarPorEstrategia(activas, estrategia)[0]
  const opcionesMes = Array.from({ length: 12 }, (_, i) => sumarMeses(hoy, i))

  const guardar = () => {
    acciones.setConfig({ abonosPlaneados: [...planeados, { id: generarId(), mes, monto: Number(monto), anual }] })
    setMonto('')
    avisar('Abono agregado a tu plan')
  }
  const quitar = (id) => acciones.setConfig({ abonosPlaneados: planeados.filter((a) => a.id !== id) })

  if (!activas.length) return null
  return (
    <section className="tarjeta herramienta">
      <div className="tarjeta-cabecera"><h3><LuGift aria-hidden="true" /> ¿Y si abono extra?</h3></div>
      <p className="nota">Prima, bono, cesantías o un ingreso extra: mira cuánto te adelanta.</p>
      <CampoMonto grande value={monto} onChange={setMonto} aria-label="Monto del abono extra" />
      <Chips
        etiqueta="Atajos de mes"
        valor={mes}
        onChange={setMes}
        opciones={[
          { valor: hoy, texto: 'Este mes' },
          { valor: proximoMes('06'), texto: 'Prima de junio' },
          { valor: proximoMes('12'), texto: 'Prima de diciembre' },
        ].filter((o, i, l) => l.findIndex((x) => x.valor === o.valor) === i)}
      />
      <div className="campo-columna">
        <div className="campo">
          <label className="campo-etiqueta" htmlFor="abono-mes">Mes</label>
          <select id="abono-mes" value={mes} onChange={(e) => setMes(e.target.value)}>
            {opcionesMes.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
          </select>
        </div>
        <div className="campo">
          <span className="campo-etiqueta">¿Se repite?</span>
          <Segmentado etiqueta="Repetir cada año" valor={anual} onChange={setAnual} opciones={[{ valor: false, texto: 'Una vez' }, { valor: true, texto: 'Cada año' }]} />
        </div>
      </div>

      {con && !base.atascada && !con.atascada && (
        <div className="resultado-sim aparecer" key={`${monto}-${mes}-${anual}`}>
          <div className="rs-grande">
            {base.meses - con.meses > 0 ? (
              <><strong>{textoMeses(base.meses - con.meses)}</strong><span>antes libre de deudas</span></>
            ) : (
              <><strong>{fmt.dinero(base.totalIntereses - con.totalIntereses)}</strong><span>menos en intereses</span></>
            )}
          </div>
          <div className="datos-grid">
            <Dato etiqueta="Ahorras en intereses" valor={fmt.dinero(Math.max(base.totalIntereses - con.totalIntereses, 0))} tono="verde" />
            <Dato etiqueta="Quedas libre en" valor={nombreMes(sumarMeses(hoy, con.meses))} />
          </div>
          {destino && <p className="nota">Según tu estrategia, el abono iría a <b>{destino.nombre}</b> (la de {estrategia === 'bola' ? 'menor saldo' : 'tasa más alta'}).</p>}
          <button className="btn btn-primario" onClick={guardar}><LuPlus aria-hidden="true" /> Incluir en mi plan</button>
        </div>
      )}
      {con && (base.atascada || con.atascada) && <p className="alerta"><LuTriangleAlert aria-hidden="true" /> Primero sube tu pago mensual: con el actual la deuda no baja.</p>}

      {planeados.length > 0 && (
        <div className="planeados">
          <p className="campo-etiqueta">Abonos incluidos en tu plan</p>
          {planeados.map((a) => (
            <div key={a.id} className="importar-item">
              <span className="icono-cat" style={{ '--c': '#EAB308' }}>{a.anual ? <LuRepeat /> : <LuGift />}</span>
              <div className="lista-texto">
                <strong>{fmt.dinero(a.monto)}</strong>
                <small>{a.anual ? `Cada ${soloMes(a.mes).toLowerCase()} desde ${nombreMes(a.mes)}` : nombreMes(a.mes)}</small>
              </div>
              <button className="btn-icono" aria-label="Quitar abono" onClick={() => quitar(a.id)}><LuTrash2 /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// =====================================================================
// 2. ¿Me alcanza para esta compra?
// =====================================================================
export function MeAlcanza({ datos, fmt, onRegistrar }) {
  const hoy = mesActual()
  const tarjetas = datos.deudas.filter((d) => d.tipo === 'tarjeta')
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState(tarjetas[0]?.id ?? '')
  const [cuotas, setCuotas] = useState(1)
  const r = resumenMes(datos, hoy)
  const { activas, pago, estrategia } = basePlan(datos)
  const extras = extrasDesde(datos.config.abonosPlaneados, hoy)

  const res = useMemo(() => {
    if (!(monto > 0)) return null
    const libre = r.libre
    if (!medio) {
      return { efectivo: true, libreDespues: libre - monto }
    }
    const d = datos.deudas.find((x) => x.id === medio)
    const compra = { id: '_nueva', nombre: 'Nueva compra', fecha: hoyISO(), monto: Number(monto), saldo: Number(monto), cuotas: Number(cuotas) || 1, cuotasPagadas: 0 }
    const sola = simularPlan([{ ...d, compras: [compra] }], 0, 'minimos')
    const cuota = cobroCompra(compra, tasaMensual(d)).total
    const primerCobro = mesPrimerCobro(d, compra) ?? hoy
    const conCompra = activas.some((x) => x.id === d.id)
      ? activas.map((x) => (x.id === d.id ? { ...x, compras: [...x.compras, compra] } : x))
      : [...activas, { ...d, compras: [...d.compras, compra] }]
    const minimosNuevos = conCompra.reduce((t, x) => t + cobroDelMes(x).total, 0)
    const antes = activas.length ? simularPlan(activas, pago, estrategia, 360, extras) : { meses: 0, totalIntereses: 0, atascada: false }
    const despues = simularPlan(conCompra, Math.max(pago, minimosNuevos), estrategia, 360, extras)
    const usoCupo = d.cupo > 0 ? (saldoDeuda(d) + Number(monto)) / d.cupo : null
    return {
      cuota, interesesCompra: sola.totalIntereses, totalCompra: Number(monto) + sola.totalIntereses,
      atraso: despues.meses - antes.meses, interesesExtra: despues.totalIntereses - antes.totalIntereses,
      subePago: Math.max(minimosNuevos - Math.max(pago, 0), 0), libreDespues: primerCobro > hoy ? libre : libre - cuota, primerCobro,
      sinCupo: d.cupo > 0 && saldoDeuda(d) + Number(monto) > d.cupo, usoCupo, tarjeta: d,
    }
  }, [monto, medio, cuotas, datos])

  let veredicto = null
  if (res) {
    if (res.libreDespues < 0 || res.sinCupo) veredicto = { tono: 'malo', Icono: LuCircleX, titulo: 'No te alcanza', texto: res.sinCupo ? 'Supera el cupo disponible de la tarjeta.' : `Este mes quedarías en ${fmt.dinero(res.libreDespues)}.` }
    else if (!res.efectivo && (res.atraso > 0 || res.interesesCompra > Number(monto) * 0.08)) veredicto = { tono: 'medio', Icono: LuHourglass, titulo: 'Te alcanza, pero cuesta', texto: res.atraso > 0 ? `Atrasa ${textoMeses(res.atraso)} tu salida de deudas.` : `Pagarías ${fmt.dinero(res.interesesCompra)} en intereses.` }
    else veredicto = { tono: 'bueno', Icono: LuThumbsUp, titulo: 'Te alcanza', texto: res.efectivo ? `Te quedarían ${fmt.dinero(res.libreDespues)} libres este mes.` : 'No afecta tu plan para salir de deudas.' }
  }

  return (
    <div className="formulario">
      <CampoMonto grande value={monto} onChange={setMonto} aria-label="Valor de la compra" autoFocus />
      <div className="campo">
        <span className="campo-etiqueta">¿Cómo la pagarías?</span>
        <Chips etiqueta="Medio de pago" valor={medio} onChange={setMedio} opciones={[{ valor: '', texto: 'Efectivo / débito' }, ...tarjetas.map((t) => ({ valor: t.id, texto: t.nombre }))]} />
      </div>
      {medio && (
        <div className="campo aparecer">
          <span className="campo-etiqueta">Cuotas</span>
          <Chips etiqueta="Cuotas" valor={cuotas} onChange={setCuotas} opciones={[1, 3, 6, 12, 24, 36].map((n) => ({ valor: n, texto: n === 1 ? '1 cuota' : `${n}` }))} />
        </div>
      )}

      {veredicto && (
        <div className={`veredicto ${veredicto.tono} aparecer`} key={`${monto}-${medio}-${cuotas}`}>
          <div className="vd-cabeza">
            <veredicto.Icono aria-hidden="true" />
            <div><strong>{veredicto.titulo}</strong><span>{veredicto.texto}</span></div>
          </div>
          {!res.efectivo && (
            <div className="datos-grid">
              <Dato etiqueta={res.primerCobro > hoy ? `Primera cuota (${nombreMes(res.primerCobro, true)})` : 'Cuota de este mes'} valor={fmt.dinero(res.cuota)} />
              <Dato etiqueta="Intereses de la compra" valor={fmt.dinero(res.interesesCompra)} tono={res.interesesCompra > 0 ? 'rojo' : 'verde'} />
              <Dato etiqueta="Pagarías en total" valor={fmt.dinero(res.totalCompra)} />
              <Dato etiqueta="Libre este mes" valor={fmt.dinero(res.libreDespues)} tono={res.libreDespues < 0 ? 'rojo' : ''} />
              {res.usoCupo !== null && <Dato etiqueta="Uso del cupo" valor={`${Math.round(res.usoCupo * 100)}%`} tono={res.usoCupo > 0.3 ? 'rojo' : ''} />}
              {res.atraso !== 0 && <Dato etiqueta="Salida de deudas" valor={res.atraso > 0 ? `+${textoMeses(res.atraso)}` : 'Igual'} tono="rojo" />}
            </div>
          )}
          {!res.efectivo && Number(cuotas) > 1 && (
            <p className="nota"><LuSparkles aria-hidden="true" /> A 1 cuota normalmente no pagas intereses: te ahorrarías {fmt.dinero(res.interesesCompra)}.</p>
          )}
          {!res.efectivo && res.primerCobro > hoy && <p className="nota-corte">Ya pasó el corte de {res.tarjeta.nombre}: esta compra se cobra en {nombreMes(res.primerCobro)}.</p>}
          {res.subePago > 0 && <p className="nota">Tu pago mensual a deudas subiría al menos {fmt.dinero(res.subePago)}.</p>}
          <button className="btn btn-secundario" onClick={() => onRegistrar({ monto: Number(monto), deudaId: medio, cuotas: Number(cuotas) })}>
            <LuCreditCard aria-hidden="true" /> La compré: registrarla
          </button>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// 3. Recordatorios en el calendario del celular
// =====================================================================
export function Recordatorios({ datos, fmt }) {
  const eventos = [
    ...datos.deudas
      .filter((d) => d.diaPago && saldoDeuda(d) > 0)
      .map((d) => ({ id: `deuda-${d.id}`, titulo: `💳 Pagar ${d.nombre}`, detalle: `Pago del mes de ${d.nombre}. Revisa el valor en Mis Finanzas.`, dia: Number(d.diaPago), tipo: 'Tarjeta', monto: cobroDelMes(d).total })),
    ...datos.fijos.map((f) => ({ id: `fijo-${f.id}`, titulo: `📅 ${f.nombre}`, detalle: `Gasto fijo: ${fmt.dinero(Number(f.monto))}`, dia: Number(f.dia) || 1, tipo: 'Fijo', monto: Number(f.monto) })),
  ].sort((a, b) => a.dia - b.dia)
  const sinDia = datos.deudas.filter((d) => !d.diaPago && saldoDeuda(d) > 0)
  const [elegidos, setElegidos] = useState(() => new Set(eventos.map((e) => e.id)))
  const [dias, setDias] = useState(2)
  const lista = eventos.filter((e) => elegidos.has(e.id))
  const alternar = (id) => setElegidos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (!eventos.length) {
    return <p className="nota">Agrega tarjetas con día de pago o gastos fijos para crear recordatorios.</p>
  }
  return (
    <div className="formulario">
      <p className="nota">Se crean como eventos que se repiten cada mes en el calendario de tu celular, con alarma antes y el mismo día.</p>
      <div className="campo">
        <span className="campo-etiqueta">Avisarme</span>
        <Segmentado etiqueta="Días de anticipación" valor={dias} onChange={setDias} opciones={[1, 2, 3].map((n) => ({ valor: n, texto: `${n} día${n > 1 ? 's' : ''} antes` }))} />
      </div>
      <ul className="lista compacta">
        {eventos.map((e) => (
          <li key={e.id}>
            <button className={`check ${elegidos.has(e.id) ? 'marcado' : ''}`} aria-label={`Incluir ${e.titulo}`} aria-pressed={elegidos.has(e.id)} onClick={() => alternar(e.id)}>✓</button>
            <div className="lista-texto" onClick={() => alternar(e.id)}>
              <strong>{e.titulo.replace(/^\S+\s/, '')}</strong>
              <small>{e.tipo} · día {e.dia} de cada mes{e.monto ? ` · ${fmt.dinero(e.monto)}` : ''}</small>
            </div>
            <a className="btn-icono" href={enlaceGoogle(e)} target="_blank" rel="noopener noreferrer" aria-label={`Agregar ${e.titulo} a Google Calendar`}>
              <LuExternalLink />
            </a>
          </li>
        ))}
      </ul>
      {sinDia.length > 0 && <p className="nota">Sin día de pago (edítalas para incluirlas): {sinDia.map((d) => d.nombre).join(', ')}.</p>}
      <button className="btn btn-primario" disabled={!lista.length} onClick={() => { descargar(crearICS(lista, dias), 'recordatorios-pagos.ics'); avisar('Abre el archivo para agregarlo a tu calendario') }}>
        <LuCalendarPlus aria-hidden="true" /> Agregar {lista.length} al calendario
      </button>
      <p className="nota">
        <b>iPhone:</b> toca "Agregar todos" al abrir el archivo. <b>Android:</b> ábrelo con tu app de calendario, o usa el botón <LuExternalLink aria-label="Google Calendar" /> de cada pago para crearlo en Google Calendar.
      </p>
    </div>
  )
}
