import { useRef } from 'react'
import { MONEDAS, hoyISO } from '../lib/format'
import { Formulario, Tarjeta } from '../components/UI'

export default function Ajustes({ datos, acciones, ir }) {
  const archivo = useRef()

  const exportar = () => {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finanzas-respaldo-${hoyISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importar = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const nuevo = JSON.parse(lector.result)
        if (!nuevo.config || !Array.isArray(nuevo.gastos)) throw new Error()
        if (confirm('Esto reemplazará todos tus datos actuales. ¿Continuar?')) {
          acciones.importar(nuevo)
          alert('Datos restaurados ✓')
        }
      } catch {
        alert('El archivo no es un respaldo válido.')
      }
      e.target.value = ''
    }
    lector.readAsText(f)
  }

  return (
    <>
      <Tarjeta titulo="Tu dinero">
        <Formulario
          key={JSON.stringify(datos.config)}
          inicial={datos.config}
          campos={[
            { nombre: 'ingresoMensual', etiqueta: 'Ingreso mensual (salario neto)', tipo: 'numero', ayuda: 'Lo que te llega a la cuenta cada mes.' },
            {
              nombre: 'presupuestoVariable',
              etiqueta: 'Presupuesto para gastos variables',
              tipo: 'numero',
              ayuda: 'Límite para comida, transporte, salidas… (sin contar fijos ni deudas).',
            },
            {
              nombre: 'moneda',
              etiqueta: 'Moneda',
              tipo: 'select',
              opciones: Object.keys(MONEDAS).map((m) => ({ valor: m, texto: m })),
            },
          ]}
          textoBoton="Guardar"
          onGuardar={(c) => {
            acciones.setConfig(c)
            ir('inicio')
          }}
        />
      </Tarjeta>

      <Tarjeta titulo="Respaldo de datos">
        <p className="nota">
          Tus datos se guardan solo en este dispositivo/navegador. Descarga un respaldo de vez en cuando o para pasarlos a otro celular.
        </p>
        <div className="botones">
          <button className="btn btn-secundario" onClick={exportar}>⬇️ Descargar respaldo</button>
          <button className="btn btn-secundario" onClick={() => archivo.current.click()}>⬆️ Restaurar respaldo</button>
          <input ref={archivo} type="file" accept="application/json" hidden onChange={importar} />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Zona de peligro">
        <button
          className="btn btn-peligro"
          onClick={() => confirm('¿Borrar TODOS los datos? No se puede deshacer.') && acciones.resetear()}
        >
          Borrar todos los datos
        </button>
      </Tarjeta>
    </>
  )
}
