import { useMemo, useState } from 'react'
import { useFinanzas } from './lib/store'
import { crearFormato, mesActual, nombreMes, sumarMeses } from './lib/format'
import Inicio from './views/Inicio'
import Gastos, { FormGasto } from './views/Gastos'
import Fijos from './views/Fijos'
import Deudas from './views/Deudas'
import Plan from './views/Plan'
import Ajustes from './views/Ajustes'
import { Hoja } from './components/UI'

const PESTANAS = [
  { id: 'inicio', texto: 'Inicio', icono: '🏠' },
  { id: 'gastos', texto: 'Gastos', icono: '🧾' },
  { id: 'fijos', texto: 'Fijos', icono: '📅' },
  { id: 'deudas', texto: 'Deudas', icono: '💳' },
  { id: 'plan', texto: 'Plan', icono: '🎯' },
]

export default function App() {
  const [datos, acciones] = useFinanzas()
  const [vista, setVista] = useState('inicio')
  const [mes, setMes] = useState(mesActual())
  const [nuevoGasto, setNuevoGasto] = useState(false)
  const fmt = useMemo(() => crearFormato(datos.config.moneda), [datos.config.moneda])

  const props = { datos, acciones, mes, fmt, ir: setVista }
  const Vista = { inicio: Inicio, gastos: Gastos, fijos: Fijos, deudas: Deudas, plan: Plan, ajustes: Ajustes }[vista]

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1>Mis Finanzas</h1>
          <button className="btn-icono" aria-label="Ajustes" onClick={() => setVista(vista === 'ajustes' ? 'inicio' : 'ajustes')}>
            ⚙️
          </button>
        </div>
        {vista !== 'ajustes' && vista !== 'plan' && (
          <div className="selector-mes">
            <button onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior">‹</button>
            <span>{nombreMes(mes)}</span>
            <button onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente">›</button>
            {mes !== mesActual() && (
              <button className="hoy" onClick={() => setMes(mesActual())}>Hoy</button>
            )}
          </div>
        )}
      </header>

      <main className="contenido">
        <Vista {...props} />
      </main>

      {vista !== 'ajustes' && (
        <button className="fab" onClick={() => setNuevoGasto(true)} aria-label="Nuevo gasto">＋</button>
      )}

      <nav className="navegacion">
        {PESTANAS.map((p) => (
          <button key={p.id} className={vista === p.id ? 'activa' : ''} onClick={() => setVista(p.id)}>
            <span>{p.icono}</span>
            {p.texto}
          </button>
        ))}
      </nav>

      {nuevoGasto && (
        <Hoja titulo="Nuevo gasto" onCerrar={() => setNuevoGasto(false)}>
          <FormGasto
            datos={datos}
            mes={mes}
            onGuardar={(g) => {
              acciones.guardarGasto(g)
              setNuevoGasto(false)
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
