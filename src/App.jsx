import { useMemo, useState } from 'react'
import {
  LuLayoutDashboard, LuReceipt, LuCreditCard, LuTarget, LuSettings, LuPlus, LuChevronLeft, LuChevronRight,
  LuRepeat, LuWallet, LuShoppingBag, LuFileSpreadsheet, LuBanknote, LuLandmark, LuCalculator, LuBellRing, LuHandCoins, LuBriefcase, LuSprout,
} from 'react-icons/lu'
import { useFinanzas } from './lib/store'
import { crearFormato, mesActual, nombreMes, sumarMeses } from './lib/format'
import { saldoDeuda } from './lib/deudas'
import Inicio from './views/Inicio'
import Gastos from './views/Gastos'
import Ingresos from './views/Ingresos'
import Tarjetas from './views/Tarjetas'
import Plan from './views/Plan'
import Ajustes from './views/Ajustes'
import Jardin from './views/Jardin'
import { Hoja, Avisos, avisar } from './components/UI'
import TarjetaVisual from './components/TarjetaVisual'
import {
  FormGasto, FormFijo, FormIngreso, AsistenteDeuda, FormEditarDeuda, FormCompra, FormPago, Importar,
} from './components/Formularios'
import { MeAlcanza, Recordatorios } from './components/Herramientas'
import { FormReclamar, FormPosponer, FormFuente, FormIngresoUnico, AccionesRecibido } from './components/IngresosUI'

const PESTANAS = [
  { id: 'inicio', texto: 'Inicio', Icono: LuLayoutDashboard },
  { id: 'gastos', texto: 'Gastos', Icono: LuReceipt },
  { id: 'ingresos', texto: 'Ingresos', Icono: LuHandCoins },
  { id: 'tarjetas', texto: 'Tarjetas', Icono: LuCreditCard },
  { id: 'plan', texto: 'Plan', Icono: LuTarget },
]

export default function App() {
  const [datos, acciones] = useFinanzas()
  const [vista, setVista] = useState('inicio')
  const [mes, setMes] = useState(mesActual())
  const [modal, setModal] = useState(null) // { tipo, ...datos }
  const fmt = useMemo(() => crearFormato(datos.config.moneda), [datos.config.moneda])

  const abrir = (tipo, extra = {}) => setModal({ tipo, ...extra })
  const cerrar = () => setModal(null)
  const ir = (v) => {
    setVista(v)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const props = { datos, acciones, mes, fmt, ir, abrir }
  const Vista = { inicio: Inicio, gastos: Gastos, ingresos: Ingresos, tarjetas: Tarjetas, plan: Plan, ajustes: Ajustes, jardin: Jardin }[vista]
  const conMes = ['inicio', 'gastos', 'ingresos'].includes(vista)
  const tarjetas = datos.deudas.filter((d) => d.tipo === 'tarjeta')
  const conSaldo = datos.deudas.filter((d) => saldoDeuda(d) > 0)

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-fila">
          <div className="marca">
            <span className="marca-logo" aria-hidden="true"><LuBanknote /></span>
            <h1>{vista === 'ajustes' ? 'Ajustes' : vista === 'jardin' ? 'Jardín' : PESTANAS.find((p) => p.id === vista)?.texto}</h1>
          </div>
          {datos.config.jardin && (
            <button className="btn-icono btn-jardin" aria-label="Jardín" aria-pressed={vista === 'jardin'} onClick={() => ir(vista === 'jardin' ? 'inicio' : 'jardin')}>
              <LuSprout />
            </button>
          )}
          <button className="btn-icono" aria-label="Ajustes" aria-pressed={vista === 'ajustes'} onClick={() => ir(vista === 'ajustes' ? 'inicio' : 'ajustes')}>
            <LuSettings />
          </button>
        </div>
        {conMes && (
          <div className="selector-mes">
            <button onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior"><LuChevronLeft /></button>
            <span aria-live="polite">{nombreMes(mes)}</span>
            <button onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente"><LuChevronRight /></button>
            {mes !== mesActual() && <button className="hoy" onClick={() => setMes(mesActual())}>Hoy</button>}
          </div>
        )}
      </header>

      <main className="contenido vista" key={vista + (conMes ? mes : '')}>
        <Vista {...props} />
      </main>

      {vista !== 'ajustes' && (
        <button className="fab" onClick={() => abrir('acciones')} aria-label="Agregar">
          <LuPlus />
        </button>
      )}

      <nav className="navegacion" aria-label="Secciones">
        <div className="nav-interior" style={{ '--i': Math.max(PESTANAS.findIndex((p) => p.id === vista), 0), '--visible': PESTANAS.some((p) => p.id === vista) ? 1 : 0 }}>
          <span className="nav-indicador" aria-hidden="true" />
          {PESTANAS.map((p) => (
            <button key={p.id} className={vista === p.id ? 'activa' : ''} aria-current={vista === p.id ? 'page' : undefined} onClick={() => ir(p.id)}>
              <p.Icono aria-hidden="true" />
              <span>{p.texto}</span>
            </button>
          ))}
        </div>
      </nav>

      <Avisos />

      {/* ---------- Hojas ---------- */}
      {modal?.tipo === 'acciones' && (
        <Hoja titulo="¿Qué quieres registrar?" onCerrar={cerrar}>
          <div className="acciones-rapidas">
            {[
              { t: 'Gasto', d: 'Del día a día', I: LuReceipt, f: () => abrir('gasto') },
              { t: 'Gasto fijo', d: 'Se repite cada mes', I: LuRepeat, f: () => abrir('fijo') },
              { t: 'Pagar tarjeta', d: 'O cuota de crédito', I: LuWallet, f: () => (conSaldo.length === 1 ? abrir('pago', { deudaId: conSaldo[0].id }) : abrir('elegir', { siguiente: 'pago' })), oculto: !conSaldo.length },
              { t: 'Compra a cuotas', d: 'Con tarjeta de crédito', I: LuShoppingBag, f: () => (tarjetas.length === 1 ? abrir('compra', { deudaId: tarjetas[0].id }) : abrir('elegir', { siguiente: 'compra' })), oculto: !tarjetas.length },
              { t: 'Tarjeta o crédito', d: 'Agregar una nueva', I: LuLandmark, f: () => abrir('deuda-nueva') },
              { t: 'Ingreso', d: 'Recibido o por recibir', I: LuBanknote, f: () => abrir('ingreso') },
              { t: 'Ingreso fijo', d: 'Salario, quincena', I: LuBriefcase, f: () => abrir('fuente') },
              { t: '¿Me alcanza?', d: 'Antes de comprar', I: LuCalculator, f: () => abrir('alcanza') },
              { t: 'Recordatorios', d: 'Pagos en tu calendario', I: LuBellRing, f: () => abrir('recordatorios') },
              { t: 'Subir Excel', d: 'Varias cosas a la vez', I: LuFileSpreadsheet, f: () => abrir('importar') },
            ]
              .filter((a) => !a.oculto)
              .map((a, i) => (
                <button key={a.t} className="accion-rapida" style={{ animationDelay: `${i * 35}ms` }} onClick={a.f}>
                  <span className="ar-icono"><a.I /></span>
                  <strong>{a.t}</strong>
                  <small>{a.d}</small>
                </button>
              ))}
          </div>
        </Hoja>
      )}

      {modal?.tipo === 'elegir' && (
        <Hoja titulo={modal.siguiente === 'pago' ? '¿Qué vas a pagar?' : '¿Con qué tarjeta?'} onCerrar={cerrar}>
          <div className="elegir-tarjeta">
            {(modal.siguiente === 'pago' ? conSaldo : tarjetas).map((d) => (
              <TarjetaVisual key={d.id} deuda={d} fmt={fmt} onClick={() => abrir(modal.siguiente, { deudaId: d.id })} />
            ))}
          </div>
        </Hoja>
      )}

      {modal?.tipo === 'gasto' && (
        <Hoja titulo={modal.gasto ? 'Editar gasto' : 'Nuevo gasto'} onCerrar={cerrar}>
          <FormGasto
            datos={datos}
            mes={mes}
            inicial={modal.gasto ?? modal.prefill}
            onGuardar={(g) => { acciones.guardarGasto(g); cerrar(); avisar(modal.gasto ? 'Gasto actualizado' : 'Gasto agregado') }}
            onEliminar={modal.gasto && (() => { acciones.eliminarGasto(modal.gasto.id); cerrar() })}
          />
        </Hoja>
      )}

      {modal?.tipo === 'fijo' && (
        <Hoja titulo={modal.fijo ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} subtitulo="Se repite todos los meses" onCerrar={cerrar}>
          <FormFijo
            inicial={modal.fijo}
            onGuardar={(f) => { acciones.guardarFijo(f); cerrar(); avisar('Gasto fijo guardado') }}
            onEliminar={modal.fijo && (() => { acciones.eliminarFijo(modal.fijo.id); cerrar() })}
          />
        </Hoja>
      )}

      {modal?.tipo === 'ingreso' && (
        <Hoja titulo={modal.ingreso ? 'Editar ingreso' : 'Nuevo ingreso'} onCerrar={cerrar}>
          <FormIngresoUnico
            mes={mes}
            inicial={modal.ingreso}
            onGuardar={(i) => { acciones.guardarIngreso(i); cerrar(); avisar(i.estado === 'esperado' ? 'Te avisaremos ese día' : 'Ingreso guardado') }}
            onEliminar={modal.ingreso && (() => { acciones.eliminarIngreso(modal.ingreso.id); cerrar() })}
          />
        </Hoja>
      )}

      {modal?.tipo === 'fuente' && (
        <Hoja titulo={modal.fuente ? `Editar ${modal.fuente.nombre}` : 'Ingreso fijo'} subtitulo="Llega cada mes o cada quincena" onCerrar={cerrar}>
          <FormFuente
            inicial={modal.fuente}
            onGuardar={(f) => { acciones.guardarFuente(f); cerrar(); avisar('Ingreso fijo guardado') }}
            onEliminar={modal.fuente && (() => { acciones.eliminarFuente(modal.fuente.id); cerrar() })}
          />
        </Hoja>
      )}

      {modal?.tipo === 'reclamar' && (
        <Hoja titulo={`¿Recibiste ${modal.item.nombre}?`} onCerrar={cerrar}>
          <FormReclamar item={modal.item} fmt={fmt} onRecibir={(x) => {
            acciones.recibirIngreso(modal.item, x)
            cerrar()
            avisar(`${fmt.dinero(x.monto)} recibidos`, { texto: 'Deshacer', onClick: () => acciones.deshacerRecibo(modal.item) })
          }} />
        </Hoja>
      )}

      {modal?.tipo === 'posponer' && (
        <Hoja titulo={`Posponer ${modal.item.nombre}`} onCerrar={cerrar}>
          <FormPosponer item={modal.item} onPosponer={(f) => { acciones.posponerIngreso(modal.item, f); cerrar(); avisar('Ingreso pospuesto') }} />
          {modal.item.extra && (
            <button className="btn-texto editar-ingreso" onClick={() => abrir('ingreso', { ingreso: modal.item.extra })}>Editar o eliminar este ingreso</button>
          )}
        </Hoja>
      )}

      {modal?.tipo === 'recibido' && (
        <Hoja titulo={modal.item.nombre} onCerrar={cerrar}>
          <AccionesRecibido item={modal.item} fmt={fmt} onDeshacer={() => { acciones.deshacerRecibo(modal.item); cerrar(); avisar('Marcado como no recibido') }} />
          {modal.item.extra && (
            <button className="btn-texto editar-ingreso" onClick={() => abrir('ingreso', { ingreso: modal.item.extra })}>Editar o eliminar este ingreso</button>
          )}
        </Hoja>
      )}

      {modal?.tipo === 'deuda-nueva' && (
        <Hoja titulo="Nueva tarjeta o crédito" onCerrar={cerrar}>
          <AsistenteDeuda
            fmt={fmt}
            onImportar={() => abrir('importar')}
            onCrear={(d, s) => { acciones.crearDeuda(d, s); cerrar(); ir('tarjetas'); avisar(`${d.nombre} agregada`) }}
          />
        </Hoja>
      )}

      {modal?.tipo === 'deuda-editar' && (() => {
        const d = datos.deudas.find((x) => x.id === modal.deudaId)
        return d && (
          <Hoja titulo={`Editar ${d.nombre}`} onCerrar={cerrar}>
            <FormEditarDeuda
              deuda={d}
              onGuardar={(x) => { acciones.guardarDeuda(x); cerrar(); avisar('Cambios guardados') }}
              onEliminar={() => { acciones.eliminarDeuda(d.id); cerrar() }}
            />
          </Hoja>
        )
      })()}

      {modal?.tipo === 'compra' && (() => {
        const d = datos.deudas.find((x) => x.id === modal.deudaId)
        return d && (
          <Hoja titulo={modal.compra ? 'Editar compra' : `Compra con ${d.nombre}`} onCerrar={cerrar}>
            <FormCompra
              deuda={d}
              inicial={modal.compra}
              onGuardar={(c) => { acciones.guardarCompra(d.id, c); cerrar(); avisar(modal.compra ? 'Compra actualizada' : 'Compra agregada') }}
              onEliminar={modal.compra && (() => { acciones.eliminarCompra(d.id, modal.compra.id); cerrar() })}
            />
          </Hoja>
        )
      })()}

      {modal?.tipo === 'pago' && (() => {
        const d = datos.deudas.find((x) => x.id === modal.deudaId)
        return d && (
          <Hoja titulo={`Pagar ${d.nombre}`} subtitulo="Primero intereses y cuotas del mes; el excedente abona a la compra más antigua" onCerrar={cerrar}>
            <FormPago deuda={d} fmt={fmt} onPagar={(m, f) => {
              const id = acciones.pagarDeuda(d.id, m, f)
              cerrar()
              avisar(datos.config.jardin ? `¡${d.nombre} está feliz! Pago de ${fmt.dinero(m)} aplicado 💛` : `Pago de ${fmt.dinero(m)} aplicado`, { texto: 'Deshacer', onClick: () => { acciones.deshacerPago(id); avisar('Pago revertido') } })
            }} />
          </Hoja>
        )
      })()}

      {modal?.tipo === 'alcanza' && (
        <Hoja titulo="¿Me alcanza?" subtitulo="Antes de comprar, mira cuánto te cuesta de verdad" onCerrar={cerrar}>
          <MeAlcanza datos={datos} fmt={fmt} onRegistrar={(p) => abrir('gasto', { prefill: { nombre: '', categoria: 'Compras', fecha: new Date().toISOString().slice(0, 10), ...p } })} />
        </Hoja>
      )}

      {modal?.tipo === 'recordatorios' && (
        <Hoja titulo="Recordatorios de pago" onCerrar={cerrar}>
          <Recordatorios datos={datos} acciones={acciones} fmt={fmt} />
        </Hoja>
      )}

      {modal?.tipo === 'importar' && (
        <Hoja titulo="Subir desde Excel" subtitulo="Tarjetas, compras a cuotas, gastos y fijos" onCerrar={cerrar}>
          <Importar fmt={fmt} onImportar={(r) => { acciones.importarLote(r); cerrar(); if (r.deudas.length) ir('tarjetas') }} />
        </Hoja>
      )}
    </div>
  )
}
