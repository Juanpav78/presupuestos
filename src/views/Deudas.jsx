import { useState } from 'react'
import { formatFecha, hoyISO, mesActual, pct } from '../lib/format'
import { interesDelMes, mesesParaPagar, simularPlan, tasaEA, tasaMensual } from '../lib/deudas'
import { resumenMes } from '../lib/resumen'
import { Formulario, Hoja, Tarjeta, Vacio, Dato } from '../components/UI'
import { Progreso } from '../components/Graficas'

const TIPOS = {
  tarjeta: '💳 Tarjeta de crédito',
  prestamo: '🏦 Préstamo / crédito',
  vehiculo: '🚗 Crédito de vehículo',
  otro: '🤝 Otra deuda',
}

export default function Deudas({ datos, acciones, mes, fmt, ir }) {
  const r = resumenMes(datos, mes)
  const [editar, setEditar] = useState(null)
  const [abonar, setAbonar] = useState(null)
  const [verAbonos, setVerAbonos] = useState(false)

  const deudas = [...datos.deudas].sort((a, b) => b.saldo - a.saldo)
  const abonosMes = datos.abonos.filter((a) => a.fecha?.startsWith(mes)).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const nombre = (id) => datos.deudas.find((d) => d.id === id)?.nombre ?? '—'

  return (
    <>
      <Tarjeta titulo="Resumen de deudas">
        <div className="datos-grid">
          <Dato etiqueta="Deuda total" valor={fmt.dinero(r.deudaTotal)} tono="rojo" />
          <Dato etiqueta="Intereses este mes" valor={fmt.dinero(r.interesesMes)} tono="rojo" />
          <Dato etiqueta="Pagos mínimos" valor={fmt.dinero(r.minimos)} />
          <Dato etiqueta="Abonado este mes" valor={fmt.dinero(r.abonado)} tono="verde" />
        </div>
        {r.utilizacion > 0 && (
          <>
            <p className="nota">
              Uso de cupo en tarjetas: <strong className={r.utilizacion > 0.3 ? 'texto-rojo' : ''}>{pct(r.utilizacion)}</strong>
              {r.utilizacion > 0.3 ? ' — lo ideal es mantenerlo por debajo del 30%.' : ' — ¡bien! Estás por debajo del 30%.'}
            </p>
            <Progreso valor={r.utilizacion} max={0.3} />
          </>
        )}
        {r.interesesMes > 0 && (
          <p className="nota">
            Pagas aprox. <strong>{fmt.dinero(r.interesesMes * 12)}</strong> al año solo en intereses si no bajas los saldos.{' '}
            <button className="btn-texto" onClick={() => ir('plan')}>Ver plan para salir de deudas →</button>
          </p>
        )}
      </Tarjeta>

      {deudas.length === 0 ? (
        <Vacio
          emoji="💳"
          texto="Agrega tus tarjetas de crédito y préstamos para calcular intereses y armar tu plan de pago."
          accion={<button className="btn btn-primario" onClick={() => setEditar({})}>Agregar deuda</button>}
        />
      ) : (
        <>
          {deudas.map((d) => {
            const interes = interesDelMes(d)
            const conMinimo = mesesParaPagar(d, d.pagoMinimo)
            const plan = conMinimo ? simularPlan([d], d.pagoMinimo, 'avalancha') : null
            const atrapado = d.saldo > 0 && d.pagoMinimo <= interes
            return (
              <Tarjeta
                key={d.id}
                className={d.saldo <= 0 ? 'pagada' : ''}
                titulo={
                  <>
                    {TIPOS[d.tipo]?.split(' ')[0]} {d.nombre}
                  </>
                }
                accion={<button className="btn-texto" onClick={() => setEditar(d)}>Editar</button>}
              >
                {d.saldo <= 0 ? (
                  <p className="nota texto-verde">🎉 ¡Pagada! Puedes eliminarla o dejarla con saldo 0.</p>
                ) : (
                  <>
                    <div className="saldo-grande">{fmt.dinero(d.saldo)}</div>
                    {d.tipo === 'tarjeta' && d.cupo > 0 && (
                      <>
                        <Progreso valor={d.saldo} max={d.cupo} color={d.saldo / d.cupo > 0.3 ? 'var(--naranja)' : 'var(--primario)'} />
                        <p className="nota">
                          {pct(d.saldo / d.cupo)} del cupo usado · Disponible {fmt.dinero(Math.max(d.cupo - d.saldo, 0))}
                        </p>
                      </>
                    )}
                    <div className="datos-grid">
                      <Dato etiqueta="Tasa" valor={`${pct(tasaEA(d), 1)} E.A. · ${pct(tasaMensual(d), 2)} M.V.`} />
                      <Dato etiqueta="Interés del mes" valor={fmt.dinero(interes)} tono="rojo" />
                      <Dato etiqueta={`Mínimo (día ${d.diaPago || '—'})`} valor={fmt.dinero(d.pagoMinimo)} />
                      <Dato
                        etiqueta="Pagando solo el mínimo"
                        valor={conMinimo ? `${conMinimo} meses` : 'Nunca termina'}
                        tono={!conMinimo || conMinimo > 36 ? 'rojo' : ''}
                      />
                    </div>
                    {atrapado ? (
                      <p className="alerta">⚠️ Tu pago mínimo no cubre ni los intereses ({fmt.dinero(interes)}). La deuda crece cada mes.</p>
                    ) : plan && plan.totalIntereses > 0 ? (
                      <p className="nota">
                        Con el mínimo pagarías <strong className="texto-rojo">{fmt.dinero(plan.totalIntereses)}</strong> en intereses en total.
                      </p>
                    ) : null}
                    <button className="btn btn-secundario" onClick={() => setAbonar(d)}>Registrar pago / abono</button>
                  </>
                )}
              </Tarjeta>
            )
          })}
          <button className="btn btn-primario ancho" onClick={() => setEditar({})}>+ Agregar deuda o tarjeta</button>
        </>
      )}

      {datos.abonos.length > 0 && (
        <Tarjeta
          titulo="Pagos del mes"
          accion={<button className="btn-texto" onClick={() => setVerAbonos(!verAbonos)}>{verAbonos ? 'Ocultar' : `Ver (${abonosMes.length})`}</button>}
        >
          {verAbonos &&
            (abonosMes.length === 0 ? (
              <p className="nota">Sin pagos registrados este mes.</p>
            ) : (
              <ul className="lista">
                {abonosMes.map((a) => (
                  <li key={a.id}>
                    <span className="icono-cat">✅</span>
                    <div className="lista-texto">
                      <strong>{nombre(a.deudaId)}</strong>
                      <small>{formatFecha(a.fecha)}</small>
                    </div>
                    <span className="monto texto-verde">{fmt.dinero(a.monto)}</span>
                    <button className="btn-icono" aria-label="Eliminar pago" onClick={() => confirm('¿Eliminar este pago? El saldo volverá a subir.') && acciones.eliminarAbono(a.id)}>🗑️</button>
                  </li>
                ))}
              </ul>
            ))}
        </Tarjeta>
      )}

      {editar && (
        <Hoja titulo={editar.id ? 'Editar deuda' : 'Nueva deuda'} onCerrar={() => setEditar(null)}>
          <Formulario
            inicial={
              editar.id
                ? editar
                : { nombre: '', tipo: 'tarjeta', saldo: '', cupo: '', tasa: '', tipoTasa: 'EA', pagoMinimo: '', diaPago: '' }
            }
            campos={[
              { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, placeholder: 'Ej: Visa Bancolombia, Préstamo libre inversión' },
              { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: Object.entries(TIPOS).map(([valor, texto]) => ({ valor, texto })) },
              { nombre: 'saldo', etiqueta: 'Saldo actual (lo que debes hoy)', tipo: 'numero', requerido: true },
              { nombre: 'cupo', etiqueta: 'Cupo total de la tarjeta', tipo: 'numero', oculto: (v) => v.tipo !== 'tarjeta' },
              { nombre: 'tasa', etiqueta: 'Tasa de interés (%)', tipo: 'numero', requerido: true, ayuda: 'Aparece en tu extracto. Ej: 28.5' },
              {
                nombre: 'tipoTasa',
                etiqueta: 'La tasa es…',
                tipo: 'select',
                opciones: [
                  { valor: 'EA', texto: 'Efectiva anual (E.A.)' },
                  { valor: 'MV', texto: 'Mensual vencida (M.V.)' },
                ],
              },
              { nombre: 'pagoMinimo', etiqueta: 'Pago mínimo / cuota mensual', tipo: 'numero', requerido: true },
              { nombre: 'diaPago', etiqueta: 'Día límite de pago', tipo: 'numero', min: 1, max: 31, paso: 1 },
            ]}
            onGuardar={(d) => {
              acciones.guardarDeuda(d)
              setEditar(null)
            }}
            onEliminar={
              editar.id &&
              (() => {
                acciones.eliminarDeuda(editar.id)
                setEditar(null)
              })
            }
          />
        </Hoja>
      )}

      {abonar && (
        <Hoja titulo={`Pago a ${abonar.nombre}`} onCerrar={() => setAbonar(null)}>
          <Formulario
            inicial={{ monto: abonar.pagoMinimo || '', fecha: mes === mesActual() ? hoyISO() : `${mes}-01` }}
            campos={[
              {
                nombre: 'monto',
                etiqueta: 'Monto pagado',
                tipo: 'numero',
                requerido: true,
                ayuda: (v) =>
                  v.monto > 0 ? `Saldo después del pago: ${fmt.dinero(Math.max(abonar.saldo - v.monto, 0))}` : `Mínimo: ${fmt.dinero(abonar.pagoMinimo)}`,
              },
              { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
            ]}
            textoBoton="Registrar pago"
            onGuardar={(a) => {
              acciones.registrarAbono({ ...a, deudaId: abonar.id })
              setAbonar(null)
            }}
          />
          <p className="nota">Tip: cuando llegue el extracto, edita la deuda y pon el saldo real (incluye intereses y compras).</p>
        </Hoja>
      )}
    </>
  )
}
