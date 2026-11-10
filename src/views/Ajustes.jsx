import { useRef } from 'react'
import { LuWallet, LuFileSpreadsheet, LuDownload, LuUpload, LuDatabase, LuTrash2, LuShieldCheck, LuSprout } from 'react-icons/lu'
import Mascota from '../components/Mascota'
import { MONEDAS, hoyISO } from '../lib/format'
import { crearExcel, descargar } from '../lib/excel'
import { exportar } from '../lib/importar'
import { Formulario, Tarjeta, avisar } from '../components/UI'

export default function Ajustes({ datos, acciones, ir, abrir }) {
  const archivo = useRef()

  const respaldoJSON = () => {
    descargar(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }), `finanzas-respaldo-${hoyISO()}.json`)
  }

  const restaurar = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const nuevo = JSON.parse(lector.result)
        if (!nuevo.config || !Array.isArray(nuevo.gastos)) throw new Error()
        if (confirm('Esto reemplazará todos tus datos actuales. ¿Continuar?')) {
          acciones.importar(nuevo)
          avisar('Datos restaurados')
        }
      } catch {
        alert('El archivo no es un respaldo válido.')
      }
    }
    lector.readAsText(f)
  }

  return (
    <>
      <Tarjeta titulo="Tu dinero" Icono={LuWallet}>
        <p className="nota">Tu salario y otros ingresos ahora se configuran en la pestaña <button className="btn-texto" onClick={() => ir('ingresos')}>Ingresos</button>.</p>
        <Formulario
          key={`${datos.config.presupuestoVariable}-${datos.config.moneda}`}
          inicial={datos.config}
          campos={[
            { nombre: 'presupuestoVariable', etiqueta: 'Presupuesto para gastos del día a día', tipo: 'monto', ayuda: 'Comida, transporte, salidas… sin contar fijos ni tarjetas.' },
            { nombre: 'moneda', etiqueta: 'Moneda', tipo: 'segmento', opciones: Object.keys(MONEDAS).map((m) => ({ valor: m, texto: m })) },
          ]}
          textoBoton="Guardar"
          onGuardar={(c) => {
            acciones.setConfig(c)
            avisar('Ajustes guardados')
            ir('inicio')
          }}
        />
      </Tarjeta>

      <Tarjeta titulo="Jardín (minijuego)" Icono={LuSprout}>
        <div className="jardin-ajuste">
          <Mascota estado={datos.config.jardin ? 'feliz' : 'tranquilo'} colorKey="oro" tamano={64} />
          <p className="nota">Cada tarjeta se vuelve una mascota que se enferma o se alegra según cómo la cuides, y un árbol crece con tu salud financiera.</p>
        </div>
        <button
          className={`interruptor ${datos.config.jardin ? 'activo' : ''}`}
          role="switch"
          aria-checked={!!datos.config.jardin}
          onClick={() => {
            const nuevo = !datos.config.jardin
            acciones.setConfig({ jardin: nuevo })
            if (nuevo) { avisar('¡Jardín activado! Búscalo en el botón 🌱 de arriba'); ir('jardin') }
          }}
        >
          <span className="interruptor-bola" aria-hidden="true" />
          {datos.config.jardin ? 'Activado' : 'Activar jardín'}
        </button>
      </Tarjeta>

      <Tarjeta titulo="Excel" Icono={LuFileSpreadsheet}>
        <p className="nota">Sube tus tarjetas, compras a cuotas, gastos y fijos desde un Excel, o descarga todo para verlo en tu computador.</p>
        <div className="botones">
          <button className="btn btn-primario" onClick={() => abrir('importar')}><LuUpload aria-hidden="true" /> Subir Excel</button>
          <button className="btn btn-secundario" onClick={async () => descargar(await crearExcel(exportar(datos)), `mis-finanzas-${hoyISO()}.xlsx`)}>
            <LuDownload aria-hidden="true" /> Descargar Excel
          </button>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Respaldo" Icono={LuDatabase}>
        <p className="nota"><LuShieldCheck aria-hidden="true" /> Tus datos se guardan solo en este dispositivo. Descarga un respaldo de vez en cuando o para pasarlos a otro celular.</p>
        <div className="botones">
          <button className="btn btn-secundario" onClick={respaldoJSON}><LuDownload aria-hidden="true" /> Descargar respaldo</button>
          <button className="btn btn-secundario" onClick={() => archivo.current.click()}><LuUpload aria-hidden="true" /> Restaurar</button>
          <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={restaurar} />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Zona de peligro" Icono={LuTrash2}>
        <button className="btn btn-peligro" onClick={() => confirm('¿Borrar TODOS los datos? No se puede deshacer.') && acciones.resetear()}>
          Borrar todos los datos
        </button>
      </Tarjeta>
    </>
  )
}
