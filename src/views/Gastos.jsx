import { useState } from 'react'
import { CATEGORIAS, formatFecha, hoyISO, infoCategoria, mesActual } from '../lib/format'
import { resumenMes } from '../lib/resumen'
import { Formulario, Hoja, Tarjeta, Vacio, Dato } from '../components/UI'
import { Progreso } from '../components/Graficas'

const opcionesCategoria = Object.entries(CATEGORIAS).map(([k, v]) => ({ valor: k, texto: `${v.emoji} ${k}` }))

export function FormGasto({ datos, mes, inicial, onGuardar, onEliminar }) {
  const tarjetas = datos.deudas.filter((d) => d.tipo === 'tarjeta')
  return (
    <Formulario
      inicial={inicial ?? { nombre: '', monto: '', categoria: 'Comida', fecha: mes === mesActual() ? hoyISO() : `${mes}-01`, deudaId: '' }}
      campos={[
        { nombre: 'nombre', etiqueta: 'Descripción', tipo: 'texto', requerido: true, placeholder: 'Ej: Mercado, almuerzo, gasolina' },
        { nombre: 'monto', etiqueta: 'Monto', tipo: 'numero', requerido: true, min: 0 },
        { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: opcionesCategoria },
        { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
        {
          nombre: 'deudaId',
          etiqueta: 'Medio de pago',
          tipo: 'select',
          opciones: [{ valor: '', texto: '💵 Efectivo / débito' }, ...tarjetas.map((t) => ({ valor: t.id, texto: `💳 ${t.nombre}` }))],
          ayuda: (v) => (v.deudaId ? 'Se sumará al saldo de esa tarjeta.' : tarjetas.length ? '' : 'Agrega tus tarjetas en "Deudas" para registrar compras a crédito.'),
        },
      ]}
      onGuardar={(g) => onGuardar({ ...g, deudaId: g.deudaId || undefined })}
      onEliminar={onEliminar}
      textoBoton={inicial ? 'Guardar cambios' : 'Añadir gasto'}
    />
  )
}

export default function Gastos({ datos, acciones, mes, fmt }) {
  const r = resumenMes(datos, mes)
  const [filtro, setFiltro] = useState('')
  const [editar, setEditar] = useState(null)
  const [ingreso, setIngreso] = useState(null)

  const lista = r.gastosMes
    .filter((g) => !filtro || g.categoria === filtro)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const porDia = lista.reduce((acc, g) => {
    ;(acc[g.fecha] = acc[g.fecha] || []).push(g)
    return acc
  }, {})

  const categoriasUsadas = [...new Set(r.gastosMes.map((g) => g.categoria))]
  const extras = datos.ingresosExtra.filter((i) => i.fecha?.startsWith(mes))
  const nombreTarjeta = (id) => datos.deudas.find((d) => d.id === id)?.nombre

  return (
    <>
      <Tarjeta titulo="Gastos del mes">
        <div className="datos-grid">
          <Dato etiqueta="Gastado" valor={fmt.dinero(r.gastado)} />
          <Dato etiqueta="Con tarjeta" valor={fmt.dinero(r.gastadoTarjeta)} />
        </div>
        {r.presupuestoVariable > 0 ? (
          <>
            <Progreso valor={r.gastado} max={r.presupuestoVariable} />
            <p className={`nota ${r.gastado > r.presupuestoVariable ? 'texto-rojo' : ''}`}>
              {r.gastado > r.presupuestoVariable
                ? `Te pasaste ${fmt.dinero(r.gastado - r.presupuestoVariable)} del presupuesto de ${fmt.dinero(r.presupuestoVariable)}`
                : `Te quedan ${fmt.dinero(r.presupuestoVariable - r.gastado)} de ${fmt.dinero(r.presupuestoVariable)} para gastos variables`}
            </p>
          </>
        ) : (
          <p className="nota">Define un presupuesto de gastos variables en ⚙️ Ajustes para controlar el límite.</p>
        )}
      </Tarjeta>

      {categoriasUsadas.length > 1 && (
        <div className="chips">
          <button className={!filtro ? 'activo' : ''} onClick={() => setFiltro('')}>Todos</button>
          {categoriasUsadas.map((c) => (
            <button key={c} className={filtro === c ? 'activo' : ''} onClick={() => setFiltro(c)}>
              {infoCategoria(c).emoji} {c}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <Vacio emoji="🧾" texto="No hay gastos registrados este mes. Usa el botón ＋ para agregar uno." />
      ) : (
        Object.entries(porDia).map(([fecha, gastos]) => (
          <div key={fecha} className="grupo-dia">
            <h4>
              {formatFecha(fecha)}
              <span>{fmt.dinero(gastos.reduce((t, g) => t + g.monto, 0))}</span>
            </h4>
            <ul className="lista">
              {gastos.map((g) => (
                <li key={g.id} onClick={() => setEditar(g)}>
                  <span className="icono-cat" style={{ background: infoCategoria(g.categoria).color + '22' }}>
                    {infoCategoria(g.categoria).emoji}
                  </span>
                  <div className="lista-texto">
                    <strong>{g.nombre}</strong>
                    <small>
                      {g.categoria}
                      {g.deudaId && ` · 💳 ${nombreTarjeta(g.deudaId) ?? 'Tarjeta'}`}
                    </small>
                  </div>
                  <span className="monto">{fmt.dinero(g.monto)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <Tarjeta
        titulo="Ingresos extra"
        accion={<button className="btn-texto" onClick={() => setIngreso({})}>+ Agregar</button>}
      >
        <p className="nota">Salario base: {fmt.dinero(datos.config.ingresoMensual)} (cámbialo en ⚙️). Aquí suma primas, bonos o trabajos extra.</p>
        {extras.length > 0 && (
          <ul className="lista">
            {extras.map((i) => (
              <li key={i.id} onClick={() => setIngreso(i)}>
                <span className="icono-cat">💰</span>
                <div className="lista-texto">
                  <strong>{i.nombre}</strong>
                  <small>{formatFecha(i.fecha)}</small>
                </div>
                <span className="monto texto-verde">+{fmt.dinero(i.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {editar && (
        <Hoja titulo="Editar gasto" onCerrar={() => setEditar(null)}>
          <FormGasto
            datos={datos}
            mes={mes}
            inicial={{ ...editar, deudaId: editar.deudaId ?? '' }}
            onGuardar={(g) => {
              acciones.guardarGasto(g)
              setEditar(null)
            }}
            onEliminar={() => {
              acciones.eliminarGasto(editar.id)
              setEditar(null)
            }}
          />
        </Hoja>
      )}

      {ingreso && (
        <Hoja titulo={ingreso.id ? 'Editar ingreso' : 'Nuevo ingreso extra'} onCerrar={() => setIngreso(null)}>
          <Formulario
            inicial={ingreso.id ? ingreso : { nombre: '', monto: '', fecha: mes === mesActual() ? hoyISO() : `${mes}-01` }}
            campos={[
              { nombre: 'nombre', etiqueta: 'Concepto', tipo: 'texto', requerido: true, placeholder: 'Ej: Prima, freelance' },
              { nombre: 'monto', etiqueta: 'Monto', tipo: 'numero', requerido: true },
              { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
            ]}
            onGuardar={(i) => {
              acciones.guardarIngreso(i)
              setIngreso(null)
            }}
            onEliminar={
              ingreso.id &&
              (() => {
                acciones.eliminarIngreso(ingreso.id)
                setIngreso(null)
              })
            }
          />
        </Hoja>
      )}
    </>
  )
}
