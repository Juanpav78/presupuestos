import { useState } from 'react'
import { CATEGORIAS, infoCategoria } from '../lib/format'
import { resumenMes } from '../lib/resumen'
import { Formulario, Hoja, Tarjeta, Vacio, Dato } from '../components/UI'
import { Progreso } from '../components/Graficas'

const opcionesCategoria = Object.entries(CATEGORIAS).map(([k, v]) => ({ valor: k, texto: `${v.emoji} ${k}` }))

export default function Fijos({ datos, acciones, mes, fmt }) {
  const r = resumenMes(datos, mes)
  const [editar, setEditar] = useState(null)
  const lista = [...datos.fijos].sort((a, b) => a.dia - b.dia)

  return (
    <>
      <Tarjeta titulo="Gastos fijos mensuales">
        <p className="nota">Arriendo, servicios, internet, celular, suscripciones… lo que pagas todos los meses. Márcalos cuando los pagues.</p>
        <div className="datos-grid">
          <Dato etiqueta="Total mensual" valor={fmt.dinero(r.fijosTotal)} />
          <Dato etiqueta="Pagado" valor={fmt.dinero(r.fijosPagados)} tono="verde" />
          <Dato etiqueta="Pendiente" valor={fmt.dinero(r.fijosTotal - r.fijosPagados)} tono={r.fijosTotal - r.fijosPagados > 0 ? 'rojo' : ''} />
          <Dato etiqueta="% del ingreso" valor={r.ingreso ? `${Math.round((r.fijosTotal / r.ingreso) * 100)}%` : '—'} />
        </div>
        <Progreso valor={r.fijosPagados} max={r.fijosTotal || 1} color="var(--verde)" />
      </Tarjeta>

      {lista.length === 0 ? (
        <Vacio
          emoji="📅"
          texto="Aún no tienes gastos fijos. Agrégalos una vez y se repiten cada mes."
          accion={<button className="btn btn-primario" onClick={() => setEditar({})}>Agregar gasto fijo</button>}
        />
      ) : (
        <ul className="lista tarjeta">
          {lista.map((f) => {
            const pagado = r.pagados.includes(f.id)
            return (
              <li key={f.id} className={pagado ? 'pagado' : ''}>
                <button
                  className={`check ${pagado ? 'marcado' : ''}`}
                  aria-label={pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  onClick={() => acciones.togglePagoFijo(mes, f.id)}
                >
                  {pagado ? '✓' : ''}
                </button>
                <div className="lista-texto" onClick={() => setEditar(f)}>
                  <strong>{infoCategoria(f.categoria).emoji} {f.nombre}</strong>
                  <small>Día {f.dia} · {f.categoria}</small>
                </div>
                <span className="monto" onClick={() => setEditar(f)}>{fmt.dinero(f.monto)}</span>
              </li>
            )
          })}
          <li className="lista-accion">
            <button className="btn-texto" onClick={() => setEditar({})}>+ Agregar gasto fijo</button>
          </li>
        </ul>
      )}

      {editar && (
        <Hoja titulo={editar.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onCerrar={() => setEditar(null)}>
          <Formulario
            inicial={editar.id ? editar : { nombre: '', monto: '', categoria: 'Vivienda', dia: 1 }}
            campos={[
              { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, placeholder: 'Ej: Arriendo, Internet, Netflix' },
              { nombre: 'monto', etiqueta: 'Monto mensual', tipo: 'numero', requerido: true },
              { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: opcionesCategoria },
              { nombre: 'dia', etiqueta: 'Día de pago', tipo: 'numero', min: 1, max: 31, paso: 1 },
            ]}
            onGuardar={(f) => {
              acciones.guardarFijo({ ...f, dia: Math.min(Math.max(f.dia || 1, 1), 31) })
              setEditar(null)
            }}
            onEliminar={
              editar.id &&
              (() => {
                acciones.eliminarFijo(editar.id)
                setEditar(null)
              })
            }
          />
        </Hoja>
      )}
    </>
  )
}
