import { useState } from 'react'
import { LuReceipt, LuRepeat, LuBanknote, LuCheck, LuPlus, LuCreditCard } from 'react-icons/lu'
import { formatFecha, pct } from '../lib/format'
import { resumenMes } from '../lib/resumen'
import { IconoCategoria } from '../lib/categorias'
import { Tarjeta, Vacio, Dato, Segmentado, NumeroAnimado } from '../components/UI'
import { Progreso } from '../components/Graficas'

export default function Gastos({ datos, acciones, mes, fmt, abrir }) {
  const [seccion, setSeccion] = useState('normales')
  return (
    <>
      <Segmentado
        etiqueta="Tipo de gastos"
        valor={seccion}
        onChange={setSeccion}
        opciones={[
          { valor: 'normales', texto: 'Del día a día', Icono: LuReceipt },
          { valor: 'fijos', texto: 'Fijos mensuales', Icono: LuRepeat },
        ]}
      />
      <div className="vista" key={seccion}>
        {seccion === 'normales' ? <Normales {...{ datos, mes, fmt, abrir }} /> : <Fijos {...{ datos, acciones, mes, fmt, abrir }} />}
      </div>
    </>
  )
}

function Normales({ datos, mes, fmt, abrir }) {
  const r = resumenMes(datos, mes)
  const [filtro, setFiltro] = useState('')
  const lista = r.gastosMes.filter((g) => !filtro || g.categoria === filtro).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const porDia = lista.reduce((acc, g) => ((acc[g.fecha] = acc[g.fecha] || []).push(g), acc), {})
  const categorias = [...new Set(r.gastosMes.map((g) => g.categoria))]
  const tarjeta = (id) => datos.deudas.find((d) => d.id === id)

  return (
    <>
      <Tarjeta className="resumen-gastos">
        <div className="rg-principal">
          <span>Gastado este mes</span>
          <strong><NumeroAnimado valor={r.gastado} formato={fmt.dinero} /></strong>
        </div>
        {r.presupuestoVariable > 0 ? (
          <>
            <Progreso valor={r.gastado} max={r.presupuestoVariable} etiqueta="Presupuesto usado" />
            <div className="datos-grid">
              <Dato etiqueta="Presupuesto" valor={fmt.dinero(r.presupuestoVariable)} />
              <Dato etiqueta={r.gastado > r.presupuestoVariable ? 'Te pasaste' : 'Te queda'} valor={fmt.dinero(Math.abs(r.presupuestoVariable - r.gastado))} tono={r.gastado > r.presupuestoVariable ? 'rojo' : 'verde'} />
            </div>
          </>
        ) : (
          <p className="nota">Pon un presupuesto mensual en Ajustes para ver cuánto te queda.</p>
        )}
        {r.gastadoTarjeta > 0 && <p className="nota"><LuCreditCard aria-hidden="true" /> {fmt.dinero(r.gastadoTarjeta)} fueron con tarjeta de crédito ({pct(r.gastadoTarjeta / r.gastado)}).</p>}
      </Tarjeta>

      {categorias.length > 1 && (
        <div className="chips desplazable">
          <button className={!filtro ? 'activo' : ''} onClick={() => setFiltro('')}>Todos</button>
          {categorias.map((c) => (
            <button key={c} className={filtro === c ? 'activo' : ''} onClick={() => setFiltro(c)}>{c}</button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <Vacio Icono={LuReceipt} titulo="Sin gastos este mes" texto="Registra cada gasto en segundos: monto, categoría y listo.">
          <button className="btn btn-primario" onClick={() => abrir('gasto')}><LuPlus aria-hidden="true" /> Agregar gasto</button>
        </Vacio>
      ) : (
        Object.entries(porDia).map(([fecha, gastos], i) => (
          <div key={fecha} className="grupo-dia" style={{ animationDelay: `${i * 40}ms` }}>
            <h4>{formatFecha(fecha)}<span>{fmt.dinero(gastos.reduce((t, g) => t + g.monto, 0))}</span></h4>
            <ul className="lista tarjeta-lista">
              {gastos.map((g) => (
                <li key={g.id} onClick={() => abrir('gasto', { gasto: g })}>
                  <IconoCategoria categoria={g.categoria} />
                  <div className="lista-texto">
                    <strong>{g.nombre}</strong>
                    <small>{g.categoria}{g.deudaId && <> · <LuCreditCard aria-hidden="true" /> {tarjeta(g.deudaId)?.nombre ?? 'Tarjeta'}</>}</small>
                  </div>
                  <span className="monto">{fmt.dinero(g.monto)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

    </>
  )
}

function Fijos({ datos, acciones, mes, fmt, abrir }) {
  const r = resumenMes(datos, mes)
  const lista = [...datos.fijos].sort((a, b) => a.dia - b.dia)
  return (
    <>
      <Tarjeta className="resumen-gastos">
        <div className="rg-principal">
          <span>Fijos del mes</span>
          <strong><NumeroAnimado valor={r.fijosTotal} formato={fmt.dinero} /></strong>
        </div>
        <Progreso valor={r.fijosPagados} max={r.fijosTotal || 1} color="var(--verde)" etiqueta="Fijos pagados" />
        <div className="datos-grid">
          <Dato etiqueta="Pagado" valor={fmt.dinero(r.fijosPagados)} tono="verde" />
          <Dato etiqueta="Pendiente" valor={fmt.dinero(r.fijosTotal - r.fijosPagados)} />
          {r.ingreso > 0 && <Dato etiqueta="% de tu ingreso" valor={pct(r.fijosTotal / r.ingreso)} />}
        </div>
      </Tarjeta>

      {lista.length === 0 ? (
        <Vacio Icono={LuRepeat} titulo="Sin gastos fijos" texto="Arriendo, servicios, internet, celular, suscripciones… agrégalos una vez y se repiten cada mes.">
          <button className="btn btn-primario" onClick={() => abrir('fijo')}><LuPlus aria-hidden="true" /> Agregar gasto fijo</button>
        </Vacio>
      ) : (
        <ul className="lista tarjeta-lista">
          {lista.map((f) => {
            const pagado = r.pagados.includes(f.id)
            return (
              <li key={f.id} className={pagado ? 'pagado' : ''}>
                <button className={`check ${pagado ? 'marcado' : ''}`} aria-label={`${f.nombre}: ${pagado ? 'pagado, marcar pendiente' : 'marcar como pagado'}`} onClick={() => acciones.togglePagoFijo(mes, f.id)}>
                  <LuCheck />
                </button>
                <IconoCategoria categoria={f.categoria} tamano={36} />
                <div className="lista-texto" onClick={() => abrir('fijo', { fijo: f })}>
                  <strong>{f.nombre}</strong>
                  <small>Día {f.dia} · {f.categoria}</small>
                </div>
                <span className="monto" onClick={() => abrir('fijo', { fijo: f })}>{fmt.dinero(f.monto)}</span>
              </li>
            )
          })}
          <li className="lista-accion"><button className="btn-texto" onClick={() => abrir('fijo')}><LuPlus aria-hidden="true" /> Agregar gasto fijo</button></li>
        </ul>
      )}
    </>
  )
}
