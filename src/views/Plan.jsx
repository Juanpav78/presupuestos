import { useMemo } from 'react'
import { LuMountain, LuSnowflake, LuTarget, LuCalendarCheck, LuLightbulb, LuTrophy, LuCreditCard } from 'react-icons/lu'
import { mesActual, nombreMes, sumarMeses, color } from '../lib/format'
import { cobroDelMes, ordenarPorEstrategia, saldoDeuda, simularPlan, tasaEA } from '../lib/deudas'
import { resumenMes } from '../lib/resumen'
import { Tarjeta, Vacio, Dato, Segmentado, NumeroAnimado } from '../components/UI'
import { Lineas, Leyenda } from '../components/Graficas'

const textoMeses = (m) => {
  if (m < 12) return `${m} ${m === 1 ? 'mes' : 'meses'}`
  const a = Math.floor(m / 12)
  const r = m % 12
  return `${a} ${a === 1 ? 'año' : 'años'}${r ? ` y ${r} ${r === 1 ? 'mes' : 'meses'}` : ''}`
}

export default function Plan({ datos, acciones, fmt, abrir }) {
  const hoy = mesActual()
  const r = resumenMes(datos, hoy)
  const activas = datos.deudas.filter((d) => saldoDeuda(d) > 0.5)
  const { estrategia } = datos.config
  const minimos = activas.reduce((t, d) => t + cobroDelMes(d).total, 0)
  const pago = Math.max(Number(datos.config.pagoDeudasMensual) || 0, minimos)
  const extra = pago - minimos

  const plan = useMemo(() => simularPlan(activas, pago, estrategia), [datos.deudas, pago, estrategia])
  const soloMinimos = useMemo(() => simularPlan(activas, minimos, 'minimos'), [datos.deudas, minimos])
  const alterna = useMemo(() => simularPlan(activas, pago, estrategia === 'avalancha' ? 'bola' : 'avalancha'), [datos.deudas, pago, estrategia])

  if (!activas.length) {
    return (
      <Vacio Icono={LuTarget} titulo={datos.deudas.length ? '¡Estás libre de deudas!' : 'Tu plan para salir de deudas'} texto={datos.deudas.length ? 'No tienes saldos pendientes. Ahora a ahorrar.' : 'Agrega tus tarjetas y créditos y te decimos cuánto pagar cada mes y cuándo quedas libre.'}>
        {!datos.deudas.length && <button className="btn btn-primario" onClick={() => abrir('deuda-nueva')}>Agregar tarjeta o crédito</button>}
      </Vacio>
    )
  }

  const libreParaDeuda = r.ingreso - r.fijosTotal - r.presupuestoVariable
  const tope = Math.max(minimos * 4, libreParaDeuda, pago, 1)
  const paso = Math.pow(10, Math.max(Math.floor(Math.log10(tope / 100)), 0))
  const minSlider = Math.floor(minimos / paso) * paso
  const maxSlider = Math.ceil(tope / paso) * paso

  const largo = Math.min(Math.max(plan.serie.length, soloMinimos.serie.length), 121)
  const rellenar = (s) => Array.from({ length: largo }, (_, i) => s[i] ?? 0)
  const etiquetas = Array.from({ length: largo }, (_, i) => nombreMes(sumarMeses(hoy, i), true))
  const ahorroIntereses = soloMinimos.totalIntereses - plan.totalIntereses
  const ahorroMeses = soloMinimos.meses - plan.meses
  const orden = ordenarPorEstrategia(activas, estrategia)

  return (
    <>
      <Tarjeta className="plan-control">
        <span className="campo-etiqueta">Cada mes voy a pagar a mis deudas</span>
        <div className="monto-plan"><NumeroAnimado valor={pago} formato={fmt.dinero} duracion={300} /></div>
        <input
          type="range"
          min={minSlider}
          max={maxSlider}
          step={paso}
          value={Math.round(pago / paso) * paso}
          style={{ '--p': (pago - minSlider) / (maxSlider - minSlider || 1) }}
          onChange={(e) => acciones.setConfig({ pagoDeudasMensual: Math.max(Number(e.target.value), minimos) })}
          aria-label="Pago mensual a deudas"
          aria-valuetext={fmt.dinero(pago)}
        />
        <div className="rango-etiquetas">
          <span>Mínimo {fmt.corto(minimos)}</span>
          <span>{fmt.corto(maxSlider)}</span>
        </div>
        <p className="nota">
          {extra > 1 ? <>Pagas <strong>{fmt.dinero(extra)}</strong> extra sobre lo del mes. Ese extra va a una sola deuda a la vez.</> : <>Solo estás pagando lo del mes. Mueve la barra y mira cuánto te ahorras.</>}
          {libreParaDeuda > minimos && <> Con tu ingreso podrías destinar hasta <strong>{fmt.dinero(libreParaDeuda)}</strong>.</>}
        </p>
        <Segmentado
          etiqueta="Estrategia"
          valor={estrategia}
          onChange={(v) => acciones.setConfig({ estrategia: v })}
          opciones={[{ valor: 'avalancha', texto: 'Avalancha', Icono: LuMountain }, { valor: 'bola', texto: 'Bola de nieve', Icono: LuSnowflake }]}
        />
        <p className="nota">
          {estrategia === 'avalancha' ? 'Avalancha: primero la deuda con la tasa más alta. Pagas menos intereses.' : 'Bola de nieve: primero la deuda más pequeña. Ves resultados rápido y te motiva.'}
          {!alterna.atascada && Math.abs(alterna.totalIntereses - plan.totalIntereses) > 1 &&
            (alterna.totalIntereses < plan.totalIntereses
              ? ` La otra estrategia te ahorraría ${fmt.dinero(plan.totalIntereses - alterna.totalIntereses)}.`
              : ` Te ahorra ${fmt.dinero(alterna.totalIntereses - plan.totalIntereses)} frente a la otra.`)}
        </p>
      </Tarjeta>

      <section className="hero plan-hero">
        <span className="hero-glow" aria-hidden="true" />
        {plan.atascada ? (
          <p className="hero-etiqueta">Con este pago no se terminan de pagar las deudas: los intereses son mayores que lo que abonas. Sube el pago mensual.</p>
        ) : (
          <>
            <span className="hero-etiqueta"><LuTrophy aria-hidden="true" /> Libre de deudas en</span>
            <div className="hero-monto">{textoMeses(plan.meses)}</div>
            <span className="hero-sub">{nombreMes(sumarMeses(hoy, plan.meses))}</span>
            <div className="hero-datos">
              <Dato etiqueta="Intereses totales" valor={fmt.corto(plan.totalIntereses)} />
              <Dato etiqueta="Total a pagar" valor={fmt.corto(plan.totalPagado)} />
              {!soloMinimos.atascada && ahorroIntereses > 1 && <Dato etiqueta="Te ahorras" valor={fmt.corto(ahorroIntereses)} tono="acento" />}
              {!soloMinimos.atascada && ahorroMeses > 0 && <Dato etiqueta="Terminas antes" valor={textoMeses(ahorroMeses)} tono="acento" />}
              {soloMinimos.atascada && <Dato etiqueta="Solo con mínimos" valor="Nunca terminas" tono="rojo" />}
            </div>
          </>
        )}
      </section>

      <Tarjeta titulo="Así baja tu deuda">
        <Lineas
          series={[
            { nombre: 'Tu plan', color: 'var(--acento)', puntos: rellenar(plan.serie), area: true },
            { nombre: 'Solo lo del mes', color: 'var(--rojo)', puntos: rellenar(soloMinimos.serie), punteada: true },
          ]}
          etiquetasX={etiquetas}
          formato={fmt.corto}
        />
        <Leyenda items={[{ nombre: 'Tu plan', color: 'var(--acento)' }, { nombre: 'Pagando solo lo del mes', color: 'var(--rojo)' }]} />
      </Tarjeta>

      <Tarjeta titulo={`Este mes paga así`} Icono={LuCreditCard}>
        <ul className="lista">
          {orden.map((d, i) => {
            const monto = plan.primerMes[d.id] ?? 0
            const objetivo = i === 0 && extra > 1
            return (
              <li key={d.id} onClick={() => abrir('pago', { deudaId: d.id })}>
                <span className={`orden ${objetivo ? 'primero' : ''}`} style={{ '--c': color(d.color).a }}>{i + 1}</span>
                <div className="lista-texto">
                  <strong>{d.nombre}</strong>
                  <small>{(tasaEA(d) * 100).toFixed(1)}% E.A. · debes {fmt.corto(saldoDeuda(d))}{objetivo && ' · 🎯 objetivo'}</small>
                </div>
                <span className="monto">{fmt.dinero(monto)}</span>
              </li>
            )
          })}
        </ul>
        <p className="nota">Cuando termines una deuda, su cuota se suma a la siguiente (efecto bola de nieve). Toca una para registrar el pago.</p>
      </Tarjeta>

      {plan.ordenPago.length > 0 && !plan.atascada && (
        <Tarjeta titulo="Calendario de liberación" Icono={LuCalendarCheck}>
          <ul className="linea-tiempo">
            {plan.ordenPago.map((o, i) => (
              <li key={o.id} style={{ animationDelay: `${i * 80}ms`, '--c': color(datos.deudas.find((d) => d.id === o.id)?.color).a }}>
                <strong>{o.nombre}</strong>
                <span>{nombreMes(sumarMeses(hoy, o.mes))} · en {textoMeses(o.mes)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Consejos para salir más rápido" Icono={LuLightbulb}>
        <ul className="consejos">
          <li>Paga siempre <strong>antes de la fecha límite</strong>: la mora suma intereses y reportes negativos.</li>
          <li>Compra a <strong>1 cuota</strong> cuando puedas: normalmente no genera intereses.</li>
          <li>No uses la tarjeta que estás pagando. Usa débito o efectivo mientras sales de deudas.</li>
          <li>Pregunta a tu banco por <strong>compra de cartera</strong> a una tasa menor.</li>
          <li>Si recibes prima o un ingreso extra, abónalo a la deuda objetivo.</li>
        </ul>
      </Tarjeta>
    </>
  )
}
