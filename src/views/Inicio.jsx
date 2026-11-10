import { infoCategoria, mesActual, nombreMes, pct } from '../lib/format'
import { historico, proximosPagos, resumenMes } from '../lib/resumen'
import { interesDelMes } from '../lib/deudas'
import { Tarjeta, Dato } from '../components/UI'
import { Barras, Dona, Leyenda, Progreso } from '../components/Graficas'

export default function Inicio({ datos, acciones, mes, fmt, ir }) {
  const r = resumenMes(datos, mes)
  const esMesActual = mes === mesActual()
  const hoyDia = esMesActual ? new Date().getDate() : 0
  const pagos = proximosPagos(datos, mes, hoyDia)
  const pendientes = pagos.filter((p) => !p.pagado)
  const pagadoMes = r.fijosPagados + r.abonado
  const sinConfigurar = !datos.config.ingresoMensual && datos.gastos.length === 0 && datos.deudas.length === 0

  // ¿A dónde va el dinero?
  const destino = [
    { nombre: 'Gastos fijos', valor: r.fijosTotal, color: '#7c3aed' },
    { nombre: 'Pago de deudas', valor: r.pagoDeudas, color: '#dc2626' },
    { nombre: 'Gastos variables', valor: r.gastadoEfectivo, color: '#f59e0b' },
    { nombre: 'Libre', valor: Math.max(r.libre, 0), color: '#16a34a' },
  ].filter((d) => d.valor > 0)

  const categorias = Object.entries(r.porCategoria)
    .map(([nombre, valor]) => ({ nombre, valor, color: infoCategoria(nombre).color }))
    .sort((a, b) => b.valor - a.valor)
  const totalCat = categorias.reduce((t, c) => t + c.valor, 0)

  const hist = historico(datos, mes, 6)

  // Regla 50/30/20 sobre el ingreso
  const tipoGasto = { necesidad: 0, deseo: 0, ahorro: 0 }
  categorias.forEach((c) => (tipoGasto[infoCategoria(c.nombre).tipo] += c.valor))
  tipoGasto.ahorro += r.pagoDeudas

  // Alertas
  const alertas = []
  if (r.libre < 0) alertas.push(`Tus gastos y compromisos superan tu ingreso por ${fmt.dinero(-r.libre)} este mes.`)
  if (r.presupuestoVariable && r.gastado > r.presupuestoVariable)
    alertas.push(`Te pasaste ${fmt.dinero(r.gastado - r.presupuestoVariable)} del presupuesto de gastos variables.`)
  if (r.utilizacion > 0.3) alertas.push(`Usas el ${pct(r.utilizacion)} del cupo de tus tarjetas. Intenta bajarlo del 30%.`)
  datos.deudas
    .filter((d) => d.saldo > 0 && d.pagoMinimo <= interesDelMes(d))
    .forEach((d) => alertas.push(`El pago mínimo de "${d.nombre}" no cubre los intereses: la deuda está creciendo.`))
  if (r.ingreso && r.minimos / r.ingreso > 0.36)
    alertas.push(`Tus cuotas de deuda son el ${pct(r.minimos / r.ingreso)} de tu ingreso (lo sano es menos del 36%).`)
  pendientes
    .filter((p) => esMesActual && p.faltan >= 0 && p.faltan <= 3)
    .forEach((p) => alertas.push(`${p.nombre} vence ${p.faltan === 0 ? 'hoy' : `en ${p.faltan} día(s)`}: ${fmt.dinero(p.monto)}.`))

  return (
    <>
      {sinConfigurar && (
        <Tarjeta className="bienvenida">
          <h3>👋 Empecemos</h3>
          <ol>
            <li><button className="btn-texto" onClick={() => ir('ajustes')}>Pon tu ingreso mensual</button></li>
            <li><button className="btn-texto" onClick={() => ir('fijos')}>Agrega tus gastos fijos</button> (arriendo, servicios…)</li>
            <li><button className="btn-texto" onClick={() => ir('deudas')}>Agrega tarjetas y préstamos</button></li>
            <li>Registra tus gastos del día a día con el botón ＋</li>
          </ol>
        </Tarjeta>
      )}

      <Tarjeta className="hero">
        <span className="hero-etiqueta">Te queda libre en {nombreMes(mes).split(' ')[0].toLowerCase()}</span>
        <div className={`hero-monto ${r.libre < 0 ? 'texto-rojo' : ''}`}>{fmt.dinero(r.libre)}</div>
        <div className="datos-grid">
          <Dato etiqueta="Ingresos" valor={fmt.dinero(r.ingreso)} tono="verde" />
          <Dato etiqueta="Fijos + deudas" valor={fmt.dinero(r.compromisos)} />
          <Dato etiqueta="Gastado (variable)" valor={fmt.dinero(r.gastado)} />
          <Dato etiqueta="Deuda total" valor={fmt.dinero(r.deudaTotal)} tono={r.deudaTotal ? 'rojo' : ''} />
        </div>
      </Tarjeta>

      {alertas.length > 0 && (
        <div className="alertas">
          {alertas.map((a, i) => (
            <p key={i} className="alerta">⚠️ {a}</p>
          ))}
        </div>
      )}

      <Tarjeta titulo="Lo que tienes que pagar este mes">
        <div className="pagar-mes">
          <div>
            <span>Total</span>
            <strong>{fmt.dinero(r.compromisos)}</strong>
          </div>
          <div>
            <span>Ya pagado</span>
            <strong className="texto-verde">{fmt.dinero(pagadoMes)}</strong>
          </div>
          <div>
            <span>Falta</span>
            <strong className="texto-rojo">{fmt.dinero(Math.max(r.compromisos - pagadoMes, 0))}</strong>
          </div>
        </div>
        <Progreso valor={pagadoMes} max={r.compromisos || 1} color="var(--verde)" />
        {pendientes.length > 0 ? (
          <ul className="lista compacta">
            {pendientes.slice(0, 6).map((p) => (
              <li key={p.tipo + p.id} onClick={() => ir(p.tipo === 'fijo' ? 'fijos' : 'deudas')}>
                <span className={`dia ${esMesActual && p.faltan < 0 ? 'vencido' : esMesActual && p.faltan <= 3 ? 'pronto' : ''}`}>{p.dia}</span>
                <div className="lista-texto">
                  <strong>{p.nombre}</strong>
                  <small>
                    {p.tipo === 'deuda' ? 'Pago mínimo' : 'Gasto fijo'}
                    {esMesActual && (p.faltan < 0 ? ' · vencido' : p.faltan === 0 ? ' · hoy' : ` · en ${p.faltan} días`)}
                  </small>
                </div>
                <span className="monto">{fmt.dinero(p.monto)}</span>
              </li>
            ))}
          </ul>
        ) : (
          pagos.length > 0 && <p className="nota texto-verde">✓ Todo pagado este mes.</p>
        )}
        {r.pagoDeudas > r.minimos && (
          <p className="nota">Incluye {fmt.dinero(r.pagoDeudas - r.minimos)} extra para deudas según tu <button className="btn-texto" onClick={() => ir('plan')}>plan</button>.</p>
        )}
      </Tarjeta>

      {destino.length > 0 && r.ingreso > 0 && (
        <Tarjeta titulo="¿A dónde va tu ingreso?">
          <div className="dona-fila">
            <Dona datos={destino} centro={pct(Math.max(r.libre, 0) / r.ingreso)} subtitulo="libre" tamano={150} />
            <Leyenda items={destino.map((d) => ({ ...d, valor: pct(d.valor / r.ingreso) }))} />
          </div>
        </Tarjeta>
      )}

      {categorias.length > 0 && (
        <Tarjeta titulo="Gastos por categoría">
          <div className="dona-fila">
            <Dona datos={categorias} centro={fmt.corto(totalCat)} subtitulo="total" tamano={150} />
            <Leyenda items={categorias.slice(0, 6).map((c) => ({ ...c, nombre: `${infoCategoria(c.nombre).emoji} ${c.nombre}`, valor: fmt.corto(c.valor) }))} />
          </div>
        </Tarjeta>
      )}

      {r.ingreso > 0 && (
        <Tarjeta titulo="Regla 50 / 30 / 20">
          <p className="nota">Una guía: 50% necesidades, 30% gustos, 20% ahorro y pago de deudas.</p>
          {[
            ['Necesidades', tipoGasto.necesidad, 0.5, '#2563eb'],
            ['Gustos', tipoGasto.deseo, 0.3, '#f59e0b'],
            ['Ahorro y deudas', tipoGasto.ahorro, 0.2, '#16a34a'],
          ].map(([n, v, meta, color]) => (
            <div key={n} className="regla">
              <div className="regla-fila">
                <span>{n}</span>
                <span>
                  <strong>{pct(v / r.ingreso)}</strong> / {pct(meta)}
                </span>
              </div>
              <Progreso valor={v} max={r.ingreso * meta} color={color} alerta={n === 'Ahorro y deudas' ? color : 'var(--rojo)'} />
            </div>
          ))}
        </Tarjeta>
      )}

      {hist.some((h) => h.variables || h.abonos) && (
        <Tarjeta titulo="Últimos 6 meses">
          <Barras
            datos={hist.map((h) => ({
              etiqueta: nombreMes(h.mes, true),
              valores: [
                { valor: h.variables, color: '#f59e0b' },
                { valor: h.abonos, color: '#16a34a' },
              ],
            }))}
            formato={fmt.dinero}
          />
          <Leyenda items={[{ nombre: 'Gastos variables', color: '#f59e0b' }, { nombre: 'Pagos a deudas', color: '#16a34a' }]} />
        </Tarjeta>
      )}
    </>
  )
}
