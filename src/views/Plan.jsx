import { useMemo } from 'react'
import { mesActual, nombreMes, sumarMeses } from '../lib/format'
import { ordenarPorEstrategia, simularPlan, tasaEA } from '../lib/deudas'
import { resumenMes } from '../lib/resumen'
import { Tarjeta, Vacio, Dato } from '../components/UI'
import { Lineas, Leyenda } from '../components/Graficas'

const textoMeses = (m) => {
  if (m < 12) return `${m} ${m === 1 ? 'mes' : 'meses'}`
  const a = Math.floor(m / 12)
  const r = m % 12
  return `${a} ${a === 1 ? 'año' : 'años'}${r ? ` y ${r} ${r === 1 ? 'mes' : 'meses'}` : ''}`
}

export default function Plan({ datos, acciones, fmt, ir }) {
  const hoy = mesActual()
  const r = resumenMes(datos, hoy)
  const activas = datos.deudas.filter((d) => d.saldo > 0)
  const { estrategia } = datos.config
  const pago = r.pagoDeudas
  const extra = pago - r.minimos

  const plan = useMemo(() => simularPlan(activas, pago, estrategia), [activas, pago, estrategia])
  const soloMinimos = useMemo(() => simularPlan(activas, r.minimos, 'minimos'), [activas, r.minimos])
  const alterna = useMemo(
    () => simularPlan(activas, pago, estrategia === 'avalancha' ? 'bola' : 'avalancha'),
    [activas, pago, estrategia]
  )

  if (activas.length === 0) {
    return (
      <Vacio
        emoji="🎯"
        texto="Agrega tus deudas y tarjetas para ver cuánto tiempo te falta para quedar libre y cuánto pagar cada mes."
        accion={<button className="btn btn-primario" onClick={() => ir('deudas')}>Ir a Deudas</button>}
      />
    )
  }

  // Margen sugerido: lo que queda libre del ingreso después de fijos y gastos variables presupuestados
  const libreParaDeuda = r.ingreso - r.fijosTotal - r.presupuestoVariable
  const maxSlider = Math.max(r.minimos * 4, libreParaDeuda, pago, 1)
  const paso = Math.pow(10, Math.max(Math.floor(Math.log10(maxSlider / 100)), 0))
  const minSlider = Math.floor(r.minimos / paso) * paso

  // Serie para la gráfica (mismo largo para ambas curvas)
  const largo = Math.min(Math.max(plan.serie.length, soloMinimos.serie.length), 121)
  const pad = (s) => Array.from({ length: largo }, (_, i) => s[i]?.total ?? 0)
  const etiquetas = Array.from({ length: largo }, (_, i) => nombreMes(sumarMeses(hoy, i), true))

  const ahorroIntereses = soloMinimos.totalIntereses - plan.totalIntereses
  const ahorroMeses = soloMinimos.meses - plan.meses
  const orden = ordenarPorEstrategia(activas, estrategia)

  return (
    <>
      <Tarjeta titulo="¿Cuánto vas a pagar a deudas cada mes?">
        <div className="monto-plan">{fmt.dinero(pago)}</div>
        <input
          type="range"
          min={minSlider}
          max={Math.ceil(maxSlider / paso) * paso}
          step={paso}
          value={Math.round(pago / paso) * paso}
          onChange={(e) => acciones.setConfig({ pagoDeudasMensual: Math.max(Number(e.target.value), r.minimos) })}
          aria-label="Pago mensual a deudas"
        />
        <div className="rango-etiquetas">
          <span>Mínimos: {fmt.corto(r.minimos)}</span>
          <span>{fmt.corto(maxSlider)}</span>
        </div>
        <p className="nota">
          {extra > 0 ? (
            <>Pagas <strong>{fmt.dinero(extra)}</strong> extra sobre los mínimos. Cada peso extra va a una sola deuda a la vez.</>
          ) : (
            <>Solo estás pagando mínimos. Mueve la barra para ver cuánto te ahorras pagando un poco más.</>
          )}
          {libreParaDeuda > r.minimos && (
            <> Según tu ingreso, fijos y presupuesto, podrías destinar hasta <strong>{fmt.dinero(libreParaDeuda)}</strong>.</>
          )}
        </p>

        <div className="segmentado">
          <button className={estrategia === 'avalancha' ? 'activo' : ''} onClick={() => acciones.setConfig({ estrategia: 'avalancha' })}>
            🏔️ Avalancha
            <small>Primero la tasa más alta</small>
          </button>
          <button className={estrategia === 'bola' ? 'activo' : ''} onClick={() => acciones.setConfig({ estrategia: 'bola' })}>
            ⛄ Bola de nieve
            <small>Primero la más pequeña</small>
          </button>
        </div>
        {Math.abs(alterna.totalIntereses - plan.totalIntereses) > 1 && !alterna.atascada && (
          <p className="nota">
            {alterna.totalIntereses < plan.totalIntereses
              ? `💡 Con ${estrategia === 'avalancha' ? 'bola de nieve' : 'avalancha'} ahorrarías ${fmt.dinero(plan.totalIntereses - alterna.totalIntereses)} en intereses.`
              : `✓ Esta estrategia te ahorra ${fmt.dinero(alterna.totalIntereses - plan.totalIntereses)} frente a la otra.`}
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Resultado del plan" className="destacada">
        {plan.atascada ? (
          <p className="alerta">⚠️ Con este pago las deudas no se terminan de pagar en 30 años: los intereses son mayores que lo que abonas. Aumenta el pago mensual.</p>
        ) : (
          <>
            <p className="libre-en">
              Libre de deudas en <strong>{textoMeses(plan.meses)}</strong>
              <span>{nombreMes(sumarMeses(hoy, plan.meses))}</span>
            </p>
            <div className="datos-grid">
              <Dato etiqueta="Intereses totales" valor={fmt.dinero(plan.totalIntereses)} tono="rojo" />
              <Dato etiqueta="Total a pagar" valor={fmt.dinero(plan.totalPagado)} />
              {!soloMinimos.atascada && ahorroIntereses > 1 && (
                <>
                  <Dato etiqueta="Ahorro vs. mínimos" valor={fmt.dinero(ahorroIntereses)} tono="verde" />
                  <Dato etiqueta="Terminas antes" valor={textoMeses(ahorroMeses)} tono="verde" />
                </>
              )}
              {soloMinimos.atascada && <Dato etiqueta="Solo con mínimos" valor="Nunca terminas" tono="rojo" />}
            </div>
          </>
        )}
        <Lineas
          series={[
            { nombre: 'Tu plan', color: 'var(--primario)', puntos: pad(plan.serie) },
            { nombre: 'Solo mínimos', color: 'var(--rojo)', puntos: pad(soloMinimos.serie), punteada: true },
          ]}
          etiquetasX={etiquetas}
          formato={fmt.corto}
        />
        <Leyenda items={[{ nombre: 'Tu plan', color: 'var(--primario)' }, { nombre: 'Solo pagando mínimos', color: 'var(--rojo)' }]} />
      </Tarjeta>

      <Tarjeta titulo={`Este mes (${nombreMes(hoy)}) paga así`}>
        <ul className="lista">
          {orden.map((d, i) => {
            const monto = plan.primerMes[d.id] ?? 0
            const esExtra = monto > Math.min(d.pagoMinimo, d.saldo) + 1
            return (
              <li key={d.id}>
                <span className={`orden ${i === 0 ? 'primero' : ''}`}>{i + 1}</span>
                <div className="lista-texto">
                  <strong>{d.nombre}</strong>
                  <small>
                    {(tasaEA(d) * 100).toFixed(1)}% E.A. · saldo {fmt.corto(d.saldo)}
                    {esExtra && ' · 🎯 objetivo'}
                  </small>
                </div>
                <span className="monto">{fmt.dinero(monto)}</span>
              </li>
            )
          })}
        </ul>
        <p className="nota">Cuando termines una deuda, su cuota se suma a la siguiente (efecto bola de nieve).</p>
      </Tarjeta>

      {plan.ordenPago.length > 0 && !plan.atascada && (
        <Tarjeta titulo="Calendario de liberación">
          <ul className="linea-tiempo">
            {plan.ordenPago.map((o) => (
              <li key={o.id}>
                <strong>{o.nombre}</strong>
                <span>{nombreMes(sumarMeses(hoy, o.mes))} · en {textoMeses(o.mes)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Consejos para salir más rápido">
        <ul className="consejos">
          <li>Paga siempre <strong>antes de la fecha límite</strong>: la mora suma intereses y reportes negativos.</li>
          <li>No uses la tarjeta que estás pagando. Compra con débito o efectivo mientras sales de deudas.</li>
          <li>Pregunta a tu banco por <strong>compra de cartera</strong> o unificar deudas a una tasa menor.</li>
          <li>Si recibes prima o un ingreso extra, abónalo a la deuda objetivo y pide <strong>reducir plazo</strong>.</li>
          <li>Arma un fondo de emergencia pequeño para no volver a endeudarte por imprevistos.</li>
        </ul>
      </Tarjeta>
    </>
  )
}
